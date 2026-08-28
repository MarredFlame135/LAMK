// src/context/CartContext.tsx
//
// FIX DE ARQUITECTURA (ronda "Smart Cart"): `useCart()` vivía como un hook
// suelto con su propio `useState` interno. Cada componente que lo llamaba
// (CatalogGrid, ProductDetail, HypeCarousel, DiscoverySection,
// SpecialCartDrawer) recibía SU PROPIA copia de estado, sin sincronizarse
// entre sí — agregar un producto desde el catálogo actualizaba SOLO la
// instancia local de CatalogGrid; el SpecialCartDrawer montado en el layout
// raíz nunca se enteraba (no se abría, no mostraba el ítem nuevo) hasta un
// refresh completo que releyera localStorage. Bug real, no hipotético.
//
// La solución es la misma que ya usa el resto del proyecto para estado
// global (AppContext, AuthContext, ThemeVariantContext): un solo Provider
// montado una vez en el layout raíz. Los 5 call-sites existentes de
// `useCart()` NO cambian ni una línea — siguen importando desde
// `@/hooks/useCart`, que ahora es un re-export de este contexto.

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, ShippingAddress, VerificationStatus } from '@/types/cart';
import { ProductVariant } from '@/types/product';

const FREE_SHIPPING_THRESHOLD = 3000; // $3,000 MXN para envío gratis
const LOCAL_STORAGE_KEY = 'lamk_cart_state_v1';

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  subtotal: number;
  shippingCost: number;
  total: number;
  remainingForFreeShipping: number;
  progressPercentage: number;
  shippingAddress: ShippingAddress | null;
  setShippingAddress: (a: ShippingAddress | null) => void;
  verificationStatus: VerificationStatus;
  otpDevHint: string | null;
  addItem: (productTitle: string, productId: string, productImage: string, variant: ProductVariant) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  triggerWhatsAppVerification: (phone: string) => Promise<void>;
  verifyOtpCode: (enteredCode: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('NOT_REQUIRED');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);

  // 1. Cargar carrito guardado en el navegador (Persistencia Offline)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setItems(parsed.items || []);
        setShippingAddress(parsed.shippingAddress || null);
      }
    } catch (e) {
      console.error('Error al restaurar carrito offline:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Guardar automáticamente cada cambio en localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ items, shippingAddress }));
    }
  }, [items, shippingAddress, isLoaded]);

  const subtotal = items.reduce((acc, item) => acc + item.variant.price * item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercentage = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0 ? 0 : 180;
  const total = subtotal + shippingCost;

  const addItem = (productTitle: string, productId: string, productImage: string, variant: ProductVariant) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variant.id === variant.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        { id: `${variant.id}-${Date.now()}`, productId, productTitle, productImage, variant, quantity: 1, addedAt: Date.now() },
      ];
    });
    setIsOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === cartItemId ? { ...item, quantity: newQty } : item)));
  };

  const clearCart = () => {
    setItems([]);
    setShippingAddress(null);
    setVerificationStatus('NOT_REQUIRED');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const triggerWhatsAppVerification = async (phone: string) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(code);
    setOtpDevHint(null);
    setVerificationStatus('PENDING_OTP');

    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('Error al enviar OTP:', data);
        setVerificationStatus('FAILED');
        return;
      }
      if (data.devCode) {
        setOtpDevHint(data.devCode);
      }
    } catch (e) {
      console.error('Error de red al solicitar OTP:', e);
      setVerificationStatus('FAILED');
    }
  };

  const verifyOtpCode = (enteredCode: string): boolean => {
    if (otpCode && enteredCode === otpCode) {
      setVerificationStatus('VERIFIED');
      setOtpCode(null);
      setOtpDevHint(null);
      return true;
    }
    setVerificationStatus('FAILED');
    return false;
  };

  return (
    <CartContext.Provider
      value={{
        items, isOpen, setIsOpen, subtotal, shippingCost, total, remainingForFreeShipping, progressPercentage,
        shippingAddress, setShippingAddress, verificationStatus, otpDevHint,
        addItem, removeItem, updateQuantity, clearCart, triggerWhatsAppVerification, verifyOtpCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
}
