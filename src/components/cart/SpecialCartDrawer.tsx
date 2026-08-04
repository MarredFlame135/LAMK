// src/components/cart/SpecialCartDrawer.tsx

'use client';

import React, { useState } from 'react';
import { useCart } from '@/hooks/useCart';

export function SpecialCartDrawer() {
  const {
    items,
    isOpen,
    setIsOpen,
    subtotal,
    shippingCost,
    total,
    remainingForFreeShipping,
    progressPercentage,
    removeItem,
    updateQuantity,
    verificationStatus,
    triggerWhatsAppVerification,
    verifyOtpCode,
  } = useCart();

  const [otpInput, setOtpInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo Oscuro con desenfoque (Glassmorphism) */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Panel Lateral Deslizante */}
      <div className="relative z-10 w-full max-w-md bg-[#0A0A0C] text-[#F4F4F0] border-l border-zinc-800 flex flex-col h-full shadow-2xl">
        
        {/* Header del Carrito */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#E60026] animate-pulse" />
            <h2 className="text-sm font-bold tracking-widest uppercase">
              TU SELECCIÓN ({items.reduce((a, b) => a + b.quantity, 0)})
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-white text-xl font-bold px-2"
          >
            ✕
          </button>
        </div>

        {/* Barra de Progreso de Envío Gratis / Perks VIP */}
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-800">
          <div className="flex justify-between text-xs mb-1 font-semibold">
            {remainingForFreeShipping > 0 ? (
              <span>Te faltan <strong className="text-[#E60026]">${remainingForFreeShipping.toLocaleString()} MXN</strong> para Envío Gratis</span>
            ) : (
              <span className="text-emerald-400 font-bold">¡ENVÍO GRATIS Y BENEFICIO VIP DESBLOQUEADO! 🔥</span>
            )}
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-[#E60026] h-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Lista de Productos en Carrito */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-lg font-medium">TU CARRITO ESTÁ VACÍO</p>
              <p className="text-xs mt-1">Explora el catálogo y asegura tu par antes de que se agote.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-3 bg-[#121215] border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition"
              >
                <img
                  src={item.productImage || '/placeholder-sneaker.webp'}
                  alt={item.productTitle}
                  className="w-20 h-20 object-cover bg-black rounded"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase line-clamp-1">{item.productTitle}</h4>
                    <p className="text-[11px] text-zinc-400">Talla: {item.variant.size.mx} MX ({item.variant.size.usMen} US)</p>
                    <p className="text-xs font-semibold text-[#E60026] mt-1">
                      ${item.variant.price.toLocaleString()} MXN
                    </p>
                  </div>
                  
                  {/* Control de Cantidad */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-zinc-700 rounded bg-black">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-xs text-zinc-400 hover:text-white"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-xs text-zinc-400 hover:text-white"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[10px] text-zinc-500 hover:text-red-500 uppercase tracking-wider"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer y Resumen de Pago */}
        {items.length > 0 && (
          <div className="p-5 border-t border-zinc-800 bg-[#121215] space-y-3">
            <div className="space-y-1 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white">${subtotal.toLocaleString()} MXN</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span className="text-white">
                  {shippingCost === 0 ? <strong className="text-emerald-400">GRATIS</strong> : `$${shippingCost} MXN`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-800">
                <span>TOTAL ESTIMADO</span>
                <span className="text-[#E60026]">${total.toLocaleString()} MXN</span>
              </div>
            </div>

            {/* Modal Secundario de Verificación WhatsApp OTP */}
            {showOtpModal ? (
              <div className="p-3 bg-zinc-900 border border-red-900/50 rounded space-y-2">
                <p className="text-xs font-bold text-zinc-200">VERIFICA TU WHATSAPP PARA CONTINUAR</p>
                <input
                  type="text"
                  placeholder="Código de 4 dígitos"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full p-2 bg-black border border-zinc-700 text-center font-mono text-sm rounded text-white"
                />
                <button
                  onClick={() => {
                    if (verifyOtpCode(otpInput)) {
                      alert('¡Verificación exitosa! Redirigiendo a pasarela segura...');
                      setShowOtpModal(false);
                    } else {
                      alert('Código incorrecto. Intenta de nuevo.');
                    }
                  }}
                  className="w-full py-2 bg-[#E60026] hover:bg-red-700 font-bold text-xs uppercase rounded"
                >
                  CONFIRMAR CÓDIGO
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  // Si requiere verificación previa, mostramos modal de OTP
                  setShowOtpModal(true);
                  triggerWhatsAppVerification(phoneInput || '5500000000');
                }}
                className="w-full py-3 bg-[#E60026] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded transition shadow-lg shadow-red-900/20"
              >
                PROCEDER AL PAGO SEGURO 🔒
              </button>
            )}

            <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest">
              Pagos 100% encriptados vía Shopify Checkout
            </p>
          </div>
        )}

      </div>
    </div>
  );
}