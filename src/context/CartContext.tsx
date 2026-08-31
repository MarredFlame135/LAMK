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
import { CartItem, VerificationStatus } from '@/types/cart';
import { ProductVariant } from '@/types/product';
import { track } from '@/lib/analytics';
import { computeCartTotals } from '@/lib/cart-math';
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
  verificationStatus: VerificationStatus;
  otpDevHint: string | null;
  addItem: (productTitle: string, productId: string, productImage: string, variant: ProductVariant) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  triggerWhatsAppVerification: (phone: string) => Promise<void>;
  verifyOtpCode: (enteredCode: string) => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('NOT_REQUIRED');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [otpTicket, setOtpTicket] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);

  // 1. Cargar carrito guardado en el navegador (Persistencia Offline)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setItems(parsed.items || []);
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ items }));
    }
  }, [items, isLoaded]);

  const { subtotal, shippingCost, total, remainingForFreeShipping, progressPercentage } = computeCartTotals(items);

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
    // Fix (hallazgo #2 de la auditoría "Prompt Maestro v4", Fase A): además
    // de Vercel Analytics (abajo), registra el evento en nuestra propia
    // base de datos — es la señal "carrito" del Índice ponderado (ver
    // lib/hype.ts). Fire-and-forget: si falla, no debe afectar agregar al
    // carrito, por eso el .catch() silencioso (el servidor ya loggea el error).
    fetch('/api/track/cart-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    }).catch(() => {});

    // Fix (hallazgo #2 de la auditoría de Fase 5): un solo punto de entrada
    // cubre todo el sitio (ficha de producto, carruseles de home, catálogo)
    // sin tener que instrumentar cada call-site por separado.
    track('add_to_cart', { productId, variantId: variant.id, price: variant.price });
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
    setVerificationStatus('NOT_REQUIRED');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  // Fix (hallazgo #4 de la auditoría de Fase 1): el código YA NO se genera
  // ni se compara aquí — el navegador nunca conoce el código en claro,
  // solo un "ticket" opaco que el servidor firma. Antes `otpCode` vivía en
  // este mismo estado de React y `verifyOtpCode` lo comparaba localmente,
  // así que cualquiera con React DevTools podía leerlo y saltarse la
  // verificación que sí bloqueaba el paso a Shopify Checkout. Ver
  // src/lib/otp.ts para el detalle completo.
  const triggerWhatsAppVerification = async (phone: string) => {
    setOtpPhone(phone);
    setOtpTicket(null);
    setOtpDevHint(null);
    setVerificationStatus('PENDING_OTP');

    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.ticket) {
        console.error('Error al enviar OTP:', data);
        setVerificationStatus('FAILED');
        return;
      }
      setOtpTicket(data.ticket);
      if (data.devCode) {
        setOtpDevHint(data.devCode);
      }
    } catch (e) {
      console.error('Error de red al solicitar OTP:', e);
      setVerificationStatus('FAILED');
    }
  };

  const verifyOtpCode = async (enteredCode: string): Promise<boolean> => {
    if (!otpTicket || !otpPhone) {
      setVerificationStatus('FAILED');
      return false;
    }
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone, ticket: otpTicket, code: enteredCode }),
      });
      const data = await res.json();

      if (res.ok && data.verified) {
        setVerificationStatus('VERIFIED');
        setOtpTicket(null);
        setOtpDevHint(null);
        return true;
      }
      setVerificationStatus('FAILED');
      return false;
    } catch (e) {
      console.error('Error de red al verificar OTP:', e);
      setVerificationStatus('FAILED');
      return false;
    }
  };

  return (
    <CartContext.Provider
      value={{
        items, isOpen, setIsOpen, subtotal, shippingCost, total, remainingForFreeShipping, progressPercentage,
        verificationStatus, otpDevHint,
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
