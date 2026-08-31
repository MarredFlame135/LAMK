// src/components/cart/SpecialCartDrawer.tsx

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { isValidMexicanPhone } from '@/lib/validators';
import { useApp } from '@/context/AppContext';
import { Magnetic } from '@/components/ui/Magnetic';
import { CrossSellModule } from '@/components/cart/CrossSellModule';
import { useAuth } from '@/context/AuthContext';
import { track } from '@/lib/analytics';

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
    otpDevHint,
    triggerWhatsAppVerification,
    verifyOtpCode,
  } = useCart();
  const { t } = useApp();
  const { user } = useAuth();

  const [step, setStep] = useState<'review' | 'checkout'>('review');
  // Fix (reportado): "Double Check" (cross-sell) ya no se queda pegado
  // después de que el usuario agrega algo, ni reaparece cada vez que
  // entra/sale del paso de checkout dentro de la misma sesión de carrito
  // abierto — se resetea solo al cerrar el drawer (mismo efecto que `step`).
  const [crossSellDismissed, setCrossSellDismissed] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
        body: JSON.stringify({ items, email: user?.email, phone: phoneInput }),
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

  // Fix (reportado): antes esto era `verifyOtpCode()` inline y cerraba el
  // modal ANTES de pedir la URL de pago. Dos problemas reales: (1) si
  // Shopify fallaba, `checkoutError` se pintaba dentro de un modal que ya
  // estaba cerrado -- el cliente se quedaba sin mensaje ni spinner; (2) el
  // reintento volvía a llamar `verifyOtpCode`, pero el ticket del OTP ya se
  // consumió al verificarse, así que SIEMPRE respondía "código incorrecto" y
  // dejaba la compra muerta. Ahora el modal sigue abierto hasta que el
  // navegador se va a Shopify, y si el número ya está verificado el
  // reintento repite solo el pago.
  const handleVerifyAndPay = async () => {
    setCheckoutError(null);
    if (verificationStatus !== 'VERIFIED') {
      setOtpVerifying(true);
      const ok = await verifyOtpCode(otpInput);
      setOtpVerifying(false);
      if (!ok) {
        setCheckoutError('Código incorrecto. Intenta de nuevo.');
        return;
      }
    }
    await handleGoToShopifyCheckout();
  };

  // Vuelve a la vista de carrito cada vez que se cierra el drawer — evita
  // que la próxima apertura arranque a medio checkout por sorpresa.
  React.useEffect(() => {
    if (!isOpen) {
      setStep('review');
      setCrossSellDismissed(false);
    }
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
          <span className="w-10 h-1 rounded-full bg-muted-foreground/40" />
        </div>

        {/* Header del Carrito */}
        <div className="px-6 sm:px-8 py-6 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#FF1E42] animate-pulse" />
            <h2 className="font-display text-lg font-black tracking-tight uppercase">
              {t.cart.title} <span className="text-muted-foreground font-normal">({items.reduce((a, b) => a + b.quantity, 0)})</span>
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Barra de Progreso de Envío Gratis / Perks VIP */}
        <div className="px-6 sm:px-8 py-4 bg-muted/40 border-b border-border">
          <div className="flex justify-between text-xs mb-2 font-semibold">
            {remainingForFreeShipping > 0 ? (
              <span>{t.cart.freeShippingRemaining} <strong className="text-[#FF1E42]">${remainingForFreeShipping.toLocaleString()} MXN</strong> {t.cart.freeShippingRemainingTail}</span>
            ) : (
              <span className="text-emerald-400 font-bold">{t.cart.freeShippingUnlocked}</span>
            )}
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-[#FF1E42] h-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Lista de Productos en Carrito */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
          {items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
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
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Talla: {item.variant.sizeLabel || `${item.variant.size.mx} MX (${item.variant.size.usMen} US)`}
                    </p>
                  </div>

                  <div className="flex items-end justify-between mt-3">
                    {/* Precio grande — jerarquía tipográfica real */}
                    <span className="font-display text-xl font-black text-[#FF1E42] tabular-nums">
                      ${(item.variant.price * item.quantity).toLocaleString()}
                      <span className="text-[10px] font-normal text-muted-foreground ml-1">MXN</span>
                    </span>

                    {/* Stepper de cantidad — pill elegante en vez de caja cuadrada */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-muted rounded-full border border-border overflow-hidden">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label="Restar cantidad"
                        >
                          −
                        </motion.button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums">{item.quantity}</span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          aria-label="Sumar cantidad"
                        >
                          +
                        </motion.button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t.cart.subtotal}</span>
                <span className="text-foreground tabular-nums">${subtotal.toLocaleString()} MXN</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t.cart.shipping}</span>
                <span className="text-foreground tabular-nums">
                  {shippingCost === 0 ? <strong className="text-emerald-400">{t.cart.free}</strong> : `$${shippingCost} MXN`}
                </span>
              </div>
              {/* Total — la cifra que más pesa en toda la pantalla, tipografía de display */}
              <div className="flex items-baseline justify-between pt-3 border-t border-border">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.cart.total}</span>
                <span className="font-display text-3xl font-black text-[#FF1E42] tabular-nums">
                  ${total.toLocaleString()}<span className="text-xs font-normal text-muted-foreground ml-1">MXN</span>
                </span>
              </div>
            </div>

            {/* Fix UX (ronda "élite"): el "Double Check" y la verificación
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
              className="flex items-center gap-2 py-2 px-3 -ml-3 text-xs font-bold text-foreground bg-muted/60 hover:bg-secondary border border-border rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              Volver al carrito
            </button>

            {/* Fix real (reportado): el paso de checkout (cross-sell +
                verificación) es contenido de altura variable dentro de un
                drawer de altura fija — antes no tenía scroll propio, así
                que cuando crecía (varias sugerencias de cross-sell + el
                modal de OTP a la vez) el contenido se salía del drawer sin
                ninguna forma de alcanzarlo ("se queda de un tamaño fijo, no
                puedo deslizar"). Ahora esta sección tiene su propio scroll
                acotado — el resumen de totales de arriba y el botón
                "Volver al carrito" siguen siempre visibles. */}
            <div className="max-h-[42vh] overflow-y-auto pr-1 -mr-1 space-y-3">
            {/* "Double Check" — cross-sell antes del checkout (RF Smart
                Cart). Fix (reportado): antes se quedaba visible aunque ya
                hubieras agregado algo, y volvía a aparecer cada vez que
                entrabas/salías del paso de checkout. Ahora se oculta en
                cuanto agregas UNA sugerencia o la descartas explícitamente
                — una sola vez por sesión de carrito abierto, no una
                invitación permanente. */}
            {!crossSellDismissed && (
              <CrossSellModule items={items} onDismiss={() => setCrossSellDismissed(true)} onAdded={() => setCrossSellDismissed(true)} />
            )}

            {/* Verificación por WhatsApp -- único paso antes de Shopify.
                Fix (pedido 2026-08-30): aquí vivía un formulario completo de
                dirección (nombre, calle, número, colonia, CP, ciudad, estado)
                que no llegaba a ningún lado: `/api/cart/checkout` solo manda
                items/email/phone, y Shopify Checkout vuelve a pedir la
                dirección completa en el paso siguiente. Era captura duplicada
                y fricción pura justo antes de pagar. La dirección se llena una
                sola vez, en Shopify. */}
            {showOtpModal ? (
              <div className="p-3 bg-muted border border-[#FF1E42]/40 rounded space-y-2">
                <p className="text-xs font-bold text-foreground">
                  VERIFICA TU WHATSAPP (+52 {phoneInput}) PARA CONTINUAR
                </p>
                {otpDevHint && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                    MODO DEV (sin credenciales de WhatsApp configuradas): tu código es <strong>{otpDevHint}</strong>
                  </p>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Código de verificación de 4 dígitos"
                  placeholder="Código de 4 dígitos"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2 bg-background border border-input text-center font-mono text-sm rounded text-foreground focus:border-[#FF1E42] outline-none"
                />
                {checkoutError && (
                  <p className="text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">{checkoutError}</p>
                )}
                <Magnetic className="block w-full" strength={0.2}>
                  <button
                    onClick={handleVerifyAndPay}
                    disabled={checkoutLoading || otpVerifying || (verificationStatus !== 'VERIFIED' && otpInput.length !== 4)}
                    className="w-full py-2 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs uppercase rounded transition"
                  >
                    {otpVerifying
                      ? 'VERIFICANDO...'
                      : checkoutLoading
                        ? 'ABRIENDO PAGO SEGURO...'
                        : verificationStatus === 'VERIFIED'
                          ? 'REINTENTAR PAGO →'
                          : 'CONFIRMAR Y PAGAR →'}
                  </button>
                </Magnetic>
                <button
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtpInput('');
                    setCheckoutError(null);
                  }}
                  className="w-full py-1.5 text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-wider transition-colors"
                >
                  Cambiar número
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="cart-whatsapp" className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  WhatsApp para confirmar tu pedido
                </label>
                <input
                  id="cart-whatsapp"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10 dígitos"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value.replace(/\D/g, ''));
                    setPhoneError(null);
                  }}
                  className="w-full p-2.5 bg-background border border-input rounded text-center font-mono text-sm text-foreground focus:border-[#FF1E42] outline-none"
                />
                {/* Fix (reportado): esto era un `alert()` del navegador -- se
                    lee como error del sistema, no del sitio, y en mobile tapa
                    el drawer completo. Ahora el error va inline, junto al
                    campo que lo produjo. */}
                {phoneError && <p className="text-[10px] text-red-600 dark:text-red-400">{phoneError}</p>}
                <Magnetic className="block w-full" strength={0.2}>
                  <button
                    onClick={() => {
                      if (!isValidMexicanPhone(phoneInput)) {
                        setPhoneError('Ingresa tu WhatsApp a 10 dígitos para verificar tu compra.');
                        return;
                      }
                      setPhoneError(null);
                      setCheckoutError(null);
                      setOtpInput('');
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

            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
              {t.cart.encryptedFooter}
            </p>
            </div>
            </motion.div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}