// src/components/ui/PrivacyConsentBanner.tsx
//
// Aviso de privacidad al entrar al sitio (LFPDPPP — obligatorio en México
// para cualquier negocio que recolecte datos personales: nombre, WhatsApp,
// dirección de envío, etc., todos datos reales que este sitio sí pide).
// Se muestra una vez por navegador hasta que el usuario acepta.

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Magnetic } from '@/components/ui/Magnetic';

const CONSENT_KEY = 'lamk_privacy_consent_v1';

export function PrivacyConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      // localStorage puede fallar en modo privado — no bloquea el sitio, solo no persiste la aceptación.
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, new Date().toISOString()); } catch {}
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
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-xs text-zinc-300 leading-relaxed flex-1">
              Usamos tus datos (nombre, WhatsApp, dirección) solo para procesar tus pedidos y avisarte sobre tu compra —
              nunca los vendemos. Lee el{' '}
              <a href="/aviso-de-privacidad" className="text-[#FF1E42] hover:underline font-semibold">
                Aviso de Privacidad completo
              </a>.
            </p>
            <Magnetic className="shrink-0" strength={0.2}>
              <button
                onClick={accept}
                className="px-5 py-2.5 bg-[#FF1E42] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition whitespace-nowrap"
              >
                Entendido
              </button>
            </Magnetic>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
