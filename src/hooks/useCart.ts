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
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null); // Solo se llena en modo desarrollo (sin credenciales de WhatsApp reales)

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

  // Lógica de Doble Verificación Inteligente por WhatsApp: se genera un código
  // real en el cliente y se manda a /api/otp para su envío por WhatsApp Cloud API.
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

      // En modo desarrollo (sin WHATSAPP_API_TOKEN configurado) el endpoint no
      // envía un WhatsApp real; devolvemos el código en pantalla para poder probar.
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
    otpDevHint,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    triggerWhatsAppVerification,
    verifyOtpCode,
  };
}