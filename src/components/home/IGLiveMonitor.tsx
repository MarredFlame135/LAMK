// src/components/home/IGLiveMonitor.tsx
//
// "Monitor de circuito cerrado" premium (Tarea 2a) — estética CCTV/broadcast
// brutalista para la presencia en redes. A propósito NO simula un feed de
// Instagram en vivo con posts/likes/comentarios inventados: este proyecto no
// tiene credenciales de Meta Graph API configuradas (ver nota idéntica en
// SocialProofSection.tsx), así que fingir actividad social sería mentir con
// datos. En su lugar, el "monitor" muestra fotografía REAL del catálogo en
// tiles estilo cámara de seguridad, con un CTA honesto al perfil real.

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Product } from '@/types/product';
import { staggerContainer, fadeIn } from '@/lib/motion';

const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/look_atmy_kicks/';

interface IGLiveMonitorProps {
  products: Product[];
}

function LiveClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-MX', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  // Server-rendered sin hora (evita mismatch de hidratación) — aparece en el
  // primer tick del cliente, un parpadeo de <1s es preferible a un `new Date()`
  // que difiera entre servidor y navegador.
  return <span className="tabular-nums">{time ?? '--:--:--'}</span>;
}

export function IGLiveMonitor({ products }: IGLiveMonitorProps) {
  const tiles = products.filter((p) => p.images[0]).slice(0, 6);
  if (tiles.length === 0) return null;

  return (
    <section className="py-16 bg-black text-zinc-100">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div variants={fadeIn} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative border border-zinc-800 bg-[#050506] rounded-xl overflow-hidden">

          {/* Scanlines + viñeta — textura de monitor, decorativa pero deliberada */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, transparent 1px, transparent 3px)' }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_60px_rgba(0,0,0,0.7)]" aria-hidden />

          {/* Barra HUD superior */}
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-zinc-800 font-mono text-[10px] uppercase tracking-[0.15em]">
            <span className="flex items-center gap-2 text-[#FF1E42]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF1E42] animate-pulse" />
              REC · CAM 01 — @LOOK_ATMY_KICKS
            </span>
            <LiveClock />
          </div>

          {/* Grid de "feeds" — fotografía real del catálogo */}
          <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-px bg-zinc-800">
            {tiles.map((p, i) => (
              <a
                key={p.id}
                href={`/product/${p.handle}`}
                className="relative aspect-square bg-black group overflow-hidden"
              >
                <Image
                  src={p.images[0]}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover grayscale-[.3] contrast-125 opacity-80 group-hover:opacity-100 group-hover:grayscale-0 transition duration-500"
                />
                {/* Marco de esquinas estilo HUD */}
                <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#FF1E42]/70" aria-hidden />
                <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#FF1E42]/70" aria-hidden />
                <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#FF1E42]/70" aria-hidden />
                <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#FF1E42]/70" aria-hidden />
                <span className="absolute top-2 right-6 font-mono text-[9px] text-[#FF1E42]/80 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="absolute bottom-2 left-6 right-6 font-mono text-[9px] text-zinc-200 uppercase truncate opacity-0 group-hover:opacity-100 transition">
                  {p.title}
                </span>
              </a>
            ))}
          </div>

          {/* CTA honesto — sin feed sincronizado real, sin inventar actividad */}
          <div className="relative flex items-center justify-between px-4 py-3 border-t border-zinc-800 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            <span>Señal: catálogo en vivo, no feed de Instagram sincronizado</span>
            <a href={INSTAGRAM_PROFILE_URL} target="_blank" rel="noreferrer" className="text-[#FF1E42] hover:text-white transition">
              Ver Instagram real ↗
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
