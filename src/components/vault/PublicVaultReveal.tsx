// src/components/vault/PublicVaultReveal.tsx
//
// Fase C (brief C.2): "la experiencia de escaneo — el momento épico".
// Compartido entre /vault/[handle] (URL pública normal) y
// /vault/pass/[token] (lo que abre un QR físico) — la secuencia es la
// misma, solo cambia de dónde vino el visitante.
//
// Reglas duras del brief, todas implementadas:
//  - Tope de 2.5s, saltable con cualquier toque, botón visible desde el
//    primer frame.
//  - Una vez por sesión por colección visitada (sessionStorage) — verla
//    tres veces no cuesta tres ceremonias.
//  - prefers-reduced-motion (o si el navegador no soporta sessionStorage,
//    ej. modo privado estricto): fade de 300ms y listo, sin secuencia.
//  - Solo transform/opacity — nunca layout ni filtros costosos.
//  - No bloquea el contenido real: éste ya está en el DOM debajo, la
//    secuencia es un overlay que se destruye, no un gate de carga.

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { EASE_LUXURY } from '@/lib/motion';

const GOLD = '#C5A059';
const CRIMSON = '#FF1E42';
const SESSION_KEY_PREFIX = 'lamk_vault_revealed_';
const SEQUENCE_MS = 2500;

export interface PublicVaultData {
  handle: string;
  serial: string;
  tier?: string;
  followerCount: number | null;
  vault: { id: string; title: string; imageUrl: string; note: string | null }[];
}

function useSeenThisSession(key: string): [boolean, () => void] {
  const [seen, setSeen] = useState(true); // true por default: nunca bloquea el primer paint mientras se revisa sessionStorage
  useEffect(() => {
    try {
      setSeen(Boolean(sessionStorage.getItem(key)));
    } catch {
      setSeen(true); // sin sessionStorage disponible (modo privado estricto) — nunca forzar la secuencia
    }
  }, [key]);
  const markSeen = () => {
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // no crítico — en el peor caso se repite la secuencia la próxima vez
    }
  };
  return [seen, markSeen];
}

export function PublicVaultReveal({ data, children }: { data: PublicVaultData; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const sessionKey = `${SESSION_KEY_PREFIX}${data.handle}`;
  const [alreadySeen, markSeen] = useSeenThisSession(sessionKey);
  const [skipped, setSkipped] = useState(false);

  const shouldPlay = !alreadySeen && !skipped && !reduceMotion;

  useEffect(() => {
    if (!shouldPlay) return;
    const timer = setTimeout(() => {
      markSeen();
      setSkipped(true);
    }, SEQUENCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlay]);

  const grail = useMemo(() => data.vault[0] ?? null, [data.vault]);

  const dismiss = () => {
    markSeen();
    setSkipped(true);
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {shouldPlay && (
          <motion.div
            className="fixed inset-0 z-[100] bg-[#050507] flex items-center justify-center cursor-pointer overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_LUXURY }}
            onClick={dismiss}
          >
            {/* Botón de saltar — visible desde el primer frame, nunca escondido */}
            <button
              onClick={dismiss}
              className="absolute top-6 right-6 z-10 px-3 py-1.5 rounded-full border border-white/20 text-white/70 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:border-white/40 transition"
            >
              Saltar →
            </button>

            {/* t=0.0-0.7 — Autenticando */}
            <motion.div
              className="absolute flex flex-col items-center gap-3"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">Autenticando coleccionista…</span>
              <motion.span
                className="font-mono text-lg font-bold tracking-widest"
                style={{ color: GOLD }}
                initial={{ filter: 'blur(4px)' }}
                animate={{ filter: 'blur(0px)' }}
                transition={{ duration: 0.6 }}
              >
                #{data.serial}
              </motion.span>
            </motion.div>

            {/* t=0.7-1.1 — La bóveda se abre: placa */}
            <motion.div
              className="absolute flex flex-col items-center gap-2"
              initial={{ opacity: 0, z: -200, y: 40 }}
              animate={{ opacity: [0, 1, 1, 0], y: [40, 0, 0, -20] }}
              transition={{ duration: 1.2, delay: 0.65, times: [0, 0.25, 0.75, 1], ease: EASE_LUXURY }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">LAMK Vault // Collector</span>
              <span className="font-display text-3xl font-black uppercase text-white">@{data.handle}</span>
              {data.tier && (
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest" style={{ color: CRIMSON }}>{data.tier}</span>
              )}
            </motion.div>

            {/* t=1.1-1.9 — La colección se materializa, en cascada */}
            {data.vault.length > 0 && (
              <motion.div
                className="absolute flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 1.0, delay: 1.15, times: [0, 0.3, 0.8, 1] }}
              >
                {data.vault.slice(0, 5).map((item, i) => (
                  <motion.div
                    key={item.id}
                    className="h-16 w-16 rounded-lg overflow-hidden border-2"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.2 + i * 0.08, ease: EASE_LUXURY }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* t=1.9-2.4 — El Grail: la pieza destacada, sola, en el centro */}
            {grail && (
              <motion.div
                className="absolute flex flex-col items-center gap-3"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: [0, 1, 1], scale: [0.85, 1.05, 1] }}
                transition={{ duration: 0.9, delay: 1.85, ease: EASE_LUXURY }}
              >
                <div className="h-40 w-40 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(197,160,89,0.35)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={grail.imageUrl} alt={grail.title} className="h-full w-full object-cover" />
                </div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: GOLD }}>Grail</span>
                <span className="font-display text-sm font-bold uppercase text-white text-center max-w-[200px] line-clamp-1">{grail.title}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
