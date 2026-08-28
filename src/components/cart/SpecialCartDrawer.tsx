// src/components/cart/SpecialCartDrawer.tsx

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { isValidMexicanPostalCode, isValidMexicanPhone } from '@/lib/validators';
import { ShippingAddress } from '@/types/cart';
import { useApp } from '@/context/AppContext';
import { Magnetic } from '@/components/ui/Magnetic';
import { CrossSellModule } from '@/components/cart/CrossSellModule';
import { useAuth } from '@/context/AuthContext';
import { track } from '@/lib/analytics';

const EMPTY_ADDRESS_FORM = {
  fullName: '', phone: '', street: '', exteriorNumber: '', interiorNumber: '',
  neighborhood: '', postalCode: '', city: '', state: '',
};

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
    shippingAddress,
    setShippingAddress,
    verificationStatus,
    otpDevHint,
    triggerWhatsAppVerification,
    verifyOtpCode,
  } = useCart();
  const { t } = useApp();
  const { user } = useAuth();

  const [step, setStep] = useState<'review' | 'checkout'>('review');
  const [otpInput, setOtpInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Checkout real: arma el carrito en Shopify y manda al cliente a su
  // Checkout oficial (tarjeta/OXXO/lo que tengas configurado en la tienda)
  // — reemplaza el alert() que antes no hacía absolutamente nada.
  const handleGoToShopifyCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, email: user?.email, phone: phoneInput || shippingAddress?.phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        setCheckoutError(data.error || 'No se pudo iniciar el pago. Intenta de nuevo.');
        return;
      }
      // Fix (hallazgo #2 de la auditoría de Fase 5): esto es lo más cerca de
      // "compra" que el sitio puede saber hoy — el checkout real pasa a
      // Shopify y el sitio nunca vuelve a enterarse si se completó (no hay
      // webhook `orders/create` configurado, ver FASE-5-ANALITICA.md).
      track('checkout_started', { itemCount: items.reduce((a, b) => a + b.quantity, 0), subtotal });
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('Error al ir a Shopify Checkout:', err);
      setCheckoutError('Error de red. Intenta de nuevo.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidMexicanPostalCode(addressForm.postalCode)) {
      setAddressError('El Código Postal debe tener 5 dígitos válidos.');
      return;
    }
    if (!isValidMexicanPhone(addressForm.phone)) {
      setAddressError('El teléfono debe tener 10 dígitos.');
      return;
    }
    setAddressError(null);
    const address: ShippingAddress = { ...addressForm, isNormalized: true };
    setShippingAddress(address);
    setPhoneInput(addressForm.phone);
  };

  // Vuelve a la vista de carrito cada vez que se cierra el drawer — evita
  // que la próxima apertura arranque a medio checkout por sorpresa.
  React.useEffect(() => {
    if (!isOpen) setStep('review');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-center sm:justify-end">
      {/* Fondo Oscuro con desenfoque (Glassmorphism) */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Bottom Sheet en mobile / Panel Lateral Deslizante en sm+ — ronda "premium overhaul": más aire, tipografía jerárquica */}
      <div className="relative z-10 w-full sm:max-w-lg h-[94vh] sm:h-full bg-background text-foreground border-t sm:border-t-0 sm:border-l border-border rounded-t-3xl sm:rounded-none flex flex-col shadow-2xl animate-[slideUpSheet_0.32s_ease-out] sm:animate-[slideInDrawer_0.32s_ease-out]">
        {/* Handle visual del bottom sheet (solo mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <span className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header del Carrito */}
        <div className="px-6 sm:px-8 py-6 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#FF1E42] animate-pulse" />
            <h2 className="font-display text-lg font-black tracking-tight uppercase">
              {t.cart.title} <span className="text-zinc-500 font-normal">({items.reduce((a, b) => a + b.quantity, 0)})</span>
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-white text-xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Barra de Progreso de Envío Gratis / Perks VIP */}
        <div className="px-6 sm:px-8 py-4 bg-zinc-900/60 border-b border-border">
          <div className="flex justify-between text-xs mb-2 font-semibold">
            {remainingForFreeShipping > 0 ? (
              <span>{t.cart.freeShippingRemaining} <strong className="text-[#FF1E42]">${remainingForFreeShipping.toLocaleString()} MXN</strong> {t.cart.freeShippingRemainingTail}</span>
            ) : (
              <span className="text-emerald-400 font-bold">{t.cart.freeShippingUnlocked}</span>
            )}
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-[#FF1E42] h-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Lista de Productos en Carrito */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
          {items.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-lg font-medium">{t.cart.empty}</p>
              <p className="text-xs mt-1">{t.cart.emptyHint}</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-5 pb-5 border-b border-border/60 last:border-b-0 last:pb-0"
              >
                <img
                  src={item.productImage || '/placeholder-sneaker.svg'}
                  alt={item.productTitle}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover bg-black rounded-xl shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h4 className="font-display text-sm font-bold uppercase tracking-tight line-clamp-1">{item.productTitle}</h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Talla: {item.variant.sizeLabel || `${item.variant.size.mx} MX (${item.variant.size.usMen} US)`}
                    </p>
                  </div>

                  <div className="flex items-end justify-between mt-3">
                    {/* Precio grande — jerarquía tipográfica real */}
                    <span className="font-display text-xl font-black text-[#FF1E42] tabular-nums">
                      ${(item.variant.price * item.quantity).toLocaleString()}
                      <span className="text-[10px] font-normal text-zinc-500 ml-1">MXN</span>
                    </span>

                    {/* Stepper de cantidad — pill elegante en vez de caja cuadrada */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-zinc-900 rounded-full border border-zinc-700 overflow-hidden">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          aria-label="Restar cantidad"
                        >
                          −
                        </motion.button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          aria-label="Sumar cantidad"
                        >
                          +
                        </motion.button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-zinc-600 hover:text-red-500 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                        aria-label="Quitar del carrito"
                        title={t.cart.remove}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer y Resumen de Pago */}
        {items.length > 0 && (
          <div className="px-6 sm:px-8 py-6 border-t border-border bg-card space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{t.cart.subtotal}</span>
                <span className="text-zinc-300 tabular-nums">${subtotal.toLocaleString()} MXN</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{t.cart.shipping}</span>
                <span className="text-zinc-300 tabular-nums">
                  {shippingCost === 0 ? <strong className="text-emerald-400">{t.cart.free}</strong> : `$${shippingCost} MXN`}
                </span>
              </div>
              {/* Total — la cifra que más pesa en toda la pantalla, tipografía de display */}
              <div className="flex items-baseline justify-between pt-3 border-t border-border">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{t.cart.total}</span>
                <span className="font-display text-3xl font-black text-[#FF1E42] tabular-nums">
                  ${total.toLocaleString()}<span className="text-xs font-normal text-zinc-500 ml-1">MXN</span>
                </span>
              </div>
            </div>

            {/* Fix UX (ronda "élite"): el "Double Check" y la dirección/OTP
                le robaban espacio a la vista inicial del carrito — el
                usuario ni veía bien sus tenis. Ahora la vista de entrada es
                solo carrito + total + un CTA grande; el cross-sell y el
                resto del checkout aparecen SOLO después de "Confirmar
                Orden", como una transición dentro del mismo drawer (nunca
                cambia de página). */}
            {step === 'review' ? (
              <motion.div key="review-cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Magnetic className="block w-full" strength={0.2}>
                  <button
                    onClick={() => setStep('checkout')}
                    className="w-full py-4 bg-[#FF1E42] hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition shadow-lg shadow-red-900/30"
                  >
                    Confirmar Orden →
                  </button>
                </Magnetic>
              </motion.div>
            ) : (
            <motion.div key="checkout-flow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Fix (reportado 2026-08-27): esto era texto gris diminuto —
                nadie lo veía, así que la única forma de "regresar" que
                encontraban era la flecha del navegador (que además saca al
                usuario del flujo del carrito). Ahora es un botón real, con
                el mismo peso visual que cualquier otro control del drawer. */}
            <button
              onClick={() => setStep('review')}
              className="flex items-center gap-2 py-2 px-3 -ml-3 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              Volver al carrito
            </button>

            {/* "Double Check" — cross-sell antes del checkout (RF Smart Cart) */}
            <CrossSellModule items={items} />

            {/* Paso 1: Dirección de envío con validación de CP mexicano (RF-07) */}
            {!shippingAddress?.isNormalized ? (
              <form onSubmit={handleSaveAddress} className="p-3 bg-zinc-900 border border-border rounded space-y-2">
                <p className="text-xs font-bold text-zinc-200">{t.cart.addressTitle}</p>
                <input
                  required
                  placeholder="Nombre completo"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                />
                <input
                  required
                  placeholder="WhatsApp (10 dígitos)"
                  maxLength={10}
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Calle"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                  />
                  <input
                    required
                    placeholder="Número ext."
                    value={addressForm.exteriorNumber}
                    onChange={(e) => setAddressForm({ ...addressForm, exteriorNumber: e.target.value })}
                    className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Colonia"
                    value={addressForm.neighborhood}
                    onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                    className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                  />
                  <input
                    required
                    placeholder="C.P. (5 dígitos)"
                    maxLength={5}
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="Ciudad"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                  />
                  <input
                    required
                    placeholder="Estado"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full p-2 bg-black border border-zinc-700 text-xs rounded text-white"
                  />
                </div>

                {addressError && <p className="text-[10px] text-red-400">{addressError}</p>}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#FF1E42] hover:bg-red-700 text-white font-bold text-xs uppercase rounded transition"
                >
                  {t.cart.saveAddress}
                </button>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between text-[10px] p-2 bg-emerald-950/30 border border-emerald-900/50 rounded">
                  <span className="text-emerald-400">
                    {shippingAddress.street} {shippingAddress.exteriorNumber}, {shippingAddress.neighborhood}, CP {shippingAddress.postalCode}
                  </span>
                  <button onClick={() => setShippingAddress(null)} className="text-zinc-400 hover:text-white uppercase font-bold ml-2">
                    {t.cart.changeAddress}
                  </button>
                </div>

                {/* Paso 2: Modal de Verificación WhatsApp OTP */}
                {showOtpModal ? (
              <div className="p-3 bg-zinc-900 border border-red-900/50 rounded space-y-2">
                <p className="text-xs font-bold text-zinc-200">
                  VERIFICA TU WHATSAPP (+52 {phoneInput}) PARA CONTINUAR
                </p>
                {otpDevHint && (
                  <p className="text-[10px] text-amber-400 font-mono">
                    MODO DEV (sin credenciales de WhatsApp configuradas): tu código es <strong>{otpDevHint}</strong>
                  </p>
                )}
                <input
                  type="text"
                  placeholder="Código de 4 dígitos"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full p-2 bg-black border border-zinc-700 text-center font-mono text-sm rounded text-white"
                />
                {checkoutError && (
                  <p className="text-[10px] text-red-400 bg-red-950/30 border border-red-900/50 rounded p-2">{checkoutError}</p>
                )}
                <Magnetic className="block w-full" strength={0.2}>
                  <button
                    onClick={async () => {
                      setCheckoutError(null);
                      setOtpVerifying(true);
                      const ok = await verifyOtpCode(otpInput);
                      setOtpVerifying(false);
                      if (ok) {
                        setShowOtpModal(false);
                        handleGoToShopifyCheckout();
                      } else {
                        setCheckoutError('Código incorrecto. Intenta de nuevo.');
                      }
                    }}
                    disabled={checkoutLoading || otpVerifying}
                    className="w-full py-2 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 font-bold text-xs uppercase rounded"
                  >
                    {otpVerifying ? 'VERIFICANDO...' : checkoutLoading ? 'ABRIENDO PAGO SEGURO...' : 'CONFIRMAR Y PAGAR →'}
                  </button>
                </Magnetic>
                <button
                  onClick={() => setShowOtpModal(false)}
                  className="w-full py-1.5 text-zinc-500 hover:text-zinc-300 text-[10px] uppercase tracking-wider"
                >
                  Cambiar número
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="tel"
                  placeholder="Tu WhatsApp a 10 dígitos"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 bg-black border border-border rounded text-center font-mono text-sm text-white focus:border-[#FF1E42] outline-none"
                />
                <Magnetic className="block w-full" strength={0.2}>
                  <button
                    onClick={() => {
                      if (phoneInput.length !== 10) {
                        alert('Ingresa tu WhatsApp a 10 dígitos para verificar tu compra.');
                        return;
                      }
                      setShowOtpModal(true);
                      triggerWhatsAppVerification(phoneInput);
                    }}
                    className="w-full py-3 bg-[#FF1E42] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded transition shadow-lg shadow-red-900/20"
                  >
                    {t.cart.proceedToPay}
                  </button>
                </Magnetic>
              </div>
            )}
              </>
            )}

            <p className="text-[10px] text-center text-zinc-500 uppercase tracking-widest">
              {t.cart.encryptedFooter}
            </p>
            </motion.div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}