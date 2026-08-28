// src/components/ui/PrivacyConsentBanner.tsx
//
// Aviso de privacidad al entrar al sitio (LFPDPPP — obligatorio en México
// para cualquier negocio que recolecte datos personales: nombre, WhatsApp,
// dirección de envío, etc., todos datos reales que este sitio sí pide).
//
// Fix (hallazgo #1 de la auditoría de Fase 5): antes esto era un solo aviso
// con un único botón ("Entendido") — un aviso, no un consentimiento. Ahora
// son dos cosas separadas:
//   1. El uso de datos operativos (nombre/WhatsApp/dirección para procesar
//      pedidos) sigue siendo solo informativo — no es opcional, es
//      necesario para que el negocio funcione, no tiene sentido pedir
//      "consentimiento" para algo sin lo cual no se puede ni enviar el
//      pedido.
//   2. El consentimiento de analítica/tracking (nuevo, ver lib/analytics.ts)
//      SÍ tiene "Aceptar" y "Rechazar" con el mismo peso visual — nada se
//      manda a Vercel Analytics hasta que la persona elige "Aceptar", y
//      "Rechazar" es una respuesta completa, no un obstáculo escondido.

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Magnetic } from '@/components/ui/Magnetic';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics';

const NOTICE_KEY = 'lamk_privacy_consent_v1';

export function PrivacyConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const noticeSeen = Boolean(localStorage.getItem(NOTICE_KEY));
      const analyticsDecided = getAnalyticsConsent() !== 'undecided';
      if (!noticeSeen || !analyticsDecided) setVisible(true);
    } catch {
      // localStorage puede fallar en modo privado — no bloquea el sitio, solo no persiste la elección.
    }
  }, []);

  const respond = (analytics: 'accepted' | 'rejected') => {
    try { localStorage.setItem(NOTICE_KEY, new Date().toISOString()); } catch {}
    setAnalyticsConsent(analytics);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="fixed bottom-0 inset-x-0 z-[70] p-4 sm:p-5"
        >
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Usamos tus datos (nombre, WhatsApp, dirección) solo para procesar tus pedidos y avisarte sobre tu compra —
              nunca los vendemos. Lee el{' '}
              <a href="/aviso-de-privacidad" className="text-[#FF1E42] hover:underline font-semibold">
                Aviso de Privacidad completo
              </a>.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-3 border-t border-border/60">
              <p className="text-[11px] text-zinc-400 leading-relaxed flex-1">
                Además, ¿nos dejas medir de forma anónima qué productos y secciones visitas? Nos ayuda a mejorar el
                catálogo — nunca incluye tu nombre, correo ni dirección, y puedes rechazarlo sin que afecte tu compra.
              </p>
              <div className="flex gap-2 shrink-0">
                <Magnetic strength={0.15}>
                  <button
                    onClick={() => respond('rejected')}
                    className="px-5 py-2.5 bg-transparent border border-zinc-600 hover:border-zinc-400 text-zinc-300 text-xs font-bold uppercase tracking-wide rounded-lg transition whitespace-nowrap"
                  >
                    Rechazar
                  </button>
                </Magnetic>
                <Magnetic strength={0.15}>
                  <button
                    onClick={() => respond('accepted')}
                    className="px-5 py-2.5 bg-[#FF1E42] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition whitespace-nowrap"
                  >
                    Aceptar
                  </button>
                </Magnetic>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
