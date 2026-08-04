// src/hooks/useCart.ts

'use client';

import { useState, useEffect } from 'react';
import { CartItem, ShippingAddress, VerificationStatus } from '@/types/cart';
import { ProductVariant } from '@/types/product';

const FREE_SHIPPING_THRESHOLD = 3000; // $3,000 MXN para envío gratis
const LOCAL_STORAGE_KEY = 'lamk_cart_state_v1';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('NOT_REQUIRED');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

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

  // 2. Guardar automáticamente cada cambio en localStorage (IndexedDB fallback)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ items, shippingAddress })
      );
    }
  }, [items, shippingAddress, isLoaded]);

  // Cálculos dinámicos
  const subtotal = items.reduce((acc, item) => acc + item.variant.price * item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercentage = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0 ? 0 : 180; // $180 MXN envío estándar
  const total = subtotal + shippingCost;

  // Acciones
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
        {
          id: `${variant.id}-${Date.now()}`,
          productId,
          productTitle,
          productImage,
          variant,
          quantity: 1,
          addedAt: Date.now(),
        },
      ];
    });
    setIsOpen(true); // Abre el side-cart automáticamente al añadir
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, quantity: newQty } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    setShippingAddress(null);
    setVerificationStatus('NOT_REQUIRED');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  // Lógica de Doble Verificación Inteligente por WhatsApp
  const triggerWhatsAppVerification = async (phone: string) => {
    setVerificationStatus('PENDING_OTP');
    // Aquí se conecta con api/otp/send-whatsapp (se construirá en el backend serverless)
    console.log(`Enviando OTP a ${phone} via WhatsApp API...`);
  };

  const verifyOtpCode = (enteredCode: string): boolean => {
    // Simulación de verificación OTP exitosa
    if (enteredCode === '1234' || enteredCode.length === 4) {
      setVerificationStatus('VERIFIED');
      return true;
    }
    setVerificationStatus('FAILED');
    return false;
  };

  return {
    items,
    isOpen,
    setIsOpen,
    subtotal,
    shippingCost,
    total,
    remainingForFreeShipping,
    progressPercentage,
    shippingAddress,
    setShippingAddress,
    verificationStatus,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    triggerWhatsAppVerification,
    verifyOtpCode,
  };
}