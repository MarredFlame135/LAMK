// src/components/tracking/TrackingHub.tsx
//
// UI minimalista de rastreo: un input gigante, detección automática de
// paquetería por formato (ver lib/carrier-detection.ts) y redirect a la URL
// oficial con el código ya inyectado. La detección es heurística — cuando
// el patrón es ambiguo (varios códigos numéricos se parecen entre
// paqueterías) se avisa explícitamente y se deja un selector manual, en vez
// de fingir certeza que el regex no tiene.

'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { detectCarrier, MANUAL_CARRIERS } from '@/lib/carrier-detection';
import { ShippingCarrier } from '@/types/order';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { Magnetic } from '@/components/ui/Magnetic';

export function TrackingHub() {
  const [code, setCode] = useState('');
  const [manualCarrier, setManualCarrier] = useState<ShippingCarrier | null>(null);

  const auto = useMemo(() => detectCarrier(code), [code]);

  // La elección manual siempre gana sobre la automática — es la corrección
  // del usuario cuando el heurístico no acertó.
  const trackingUrl = manualCarrier
    ? MANUAL_CARRIERS.find((c) => c.carrier === manualCarrier)?.trackingUrl(code.trim().toUpperCase())
    : auto?.trackingUrl;

  const handleGo = () => {
    if (!trackingUrl) return;
    window.open(trackingUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto px-4 py-20 text-center"
    >
      <motion.p variants={fadeUp} className="text-xs font-mono text-[#FF1E42] uppercase tracking-[0.2em]">
        // Tracking Hub
      </motion.p>
      <motion.h1 variants={fadeUp} className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight mt-2">
        ¿Dónde está tu par?
      </motion.h1>
      <motion.p variants={fadeUp} className="text-zinc-400 text-sm mt-3 max-w-md mx-auto">
        Pega el código que te mandamos por WhatsApp o correo. Detectamos la paquetería automáticamente.
      </motion.p>

      <motion.div variants={fadeUp} className="mt-10">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setManualCarrier(null); }}
          placeholder="Pega tu código de rastreo aquí"
          autoFocus
          className="w-full text-center text-lg sm:text-2xl font-mono tracking-wider py-6 px-4 bg-card border-2 border-border rounded-2xl text-white placeholder:text-zinc-600 outline-none focus:border-[#FF1E42] transition-colors"
        />
      </motion.div>

      {code.trim() && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          {auto ? (
            <div className="text-xs font-mono uppercase tracking-widest">
              {auto.confident ? (
                <span className="text-emerald-400">Detectado: {auto.label}</span>
              ) : (
                <span className="text-amber-400">
                  Probablemente {auto.label} — confirma abajo si no es correcto
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">
              No reconocimos el formato — elige la paquetería manualmente
            </div>
          )}

          <div className="flex justify-center gap-2">
            {MANUAL_CARRIERS.map((c) => (
              <button
                key={c.carrier}
                onClick={() => setManualCarrier(c.carrier)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-full border transition ${
                  (manualCarrier || auto?.carrier) === c.carrier
                    ? 'bg-[#FF1E42] border-[#FF1E42] text-white'
                    : 'border-border text-zinc-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <Magnetic className="inline-block">
            <button
              onClick={handleGo}
              disabled={!trackingUrl}
              className="px-8 py-4 bg-[#FF1E42] hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition"
            >
              Rastrear envío →
            </button>
          </Magnetic>
        </motion.div>
      )}
    </motion.div>
  );
}
