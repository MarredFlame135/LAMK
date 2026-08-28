// src/components/home/Lookbook.tsx
//
// "Fit Check" / Lookbook de modelos — grid editorial asimétrico, borde a
// borde. Las imágenes son placeholders generados con Higgsfield para no
// dejar la sección vacía; reemplázalas por fotografía real del mismo
// tamaño/aspect-ratio en las rutas de abajo — el código no cambia, solo el
// contenido de los archivos.
//
// Colección por temporada (2026-08-27, pedido del cliente: "que sea toda
// una colección, hasta por temporada"): 9 piezas en dos ánimos — NIGHT RUNS
// (nocturno, moody) y CONCRETE HEAT (diurno, cálido) — cada tile lleva su
// insignia de temporada.
//
//   public/images/lookbook/modelo-1.png..modelo-5.png  → NIGHT RUNS
//   public/images/lookbook/modelo-6.png..modelo-9.png  → CONCRETE HEAT
//   (1,2,4,6,9 son retrato 3:4 · 3,5,7,8 son horizontal 4:3 — mantén el
//   aspect-ratio al reemplazar para que el grid no se deforme)

'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { Magnetic } from '@/components/ui/Magnetic';

type Season = 'NIGHT RUNS' | 'CONCRETE HEAT';

interface LookbookItem {
  src: string;
  alt: string;
  caption: string;
  season: Season;
  span: string;
}

const ITEMS: LookbookItem[] = [
  { src: '/images/lookbook/modelo-1.png', alt: 'Fit check — outfit 01', caption: 'Concrete Steps', season: 'NIGHT RUNS', span: 'col-span-2 row-span-2' },
  { src: '/images/lookbook/modelo-2.png', alt: 'Fit check — outfit 02', caption: 'Raw Wall', season: 'NIGHT RUNS', span: 'col-span-2' },
  { src: '/images/lookbook/modelo-3.png', alt: 'Fit check — outfit 03', caption: 'Wet Asphalt', season: 'NIGHT RUNS', span: 'col-span-2' },
  { src: '/images/lookbook/modelo-4.png', alt: 'Fit check — outfit 04', caption: 'Empty Street', season: 'NIGHT RUNS', span: 'col-span-2 row-span-2' },
  { src: '/images/lookbook/modelo-5.png', alt: 'Fit check — outfit 05', caption: 'Curb Sit', season: 'NIGHT RUNS', span: 'col-span-2' },
  { src: '/images/lookbook/modelo-6.png', alt: 'Fit check — outfit 06', caption: 'Golden Plaza', season: 'CONCRETE HEAT', span: 'col-span-2' },
  { src: '/images/lookbook/modelo-7.png', alt: 'Fit check — outfit 07', caption: 'Sunlit Wall', season: 'CONCRETE HEAT', span: 'col-span-2 row-span-2' },
  { src: '/images/lookbook/modelo-8.png', alt: 'Fit check — outfit 08', caption: 'Skate Park', season: 'CONCRETE HEAT', span: 'col-span-2' },
  { src: '/images/lookbook/modelo-9.png', alt: 'Fit check — outfit 09', caption: 'Daylight Steps', season: 'CONCRETE HEAT', span: 'col-span-2' },
];

function LookbookTile({ item, index }: { item: LookbookItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scrollScale = useTransform(scrollYProgress, [0, 0.5, 1], reduceMotion ? [1, 1, 1] : [1, 1.1, 1]);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10%' }}
      transition={{ delay: (index % 9) * 0.05 }}
      className={`relative overflow-hidden bg-zinc-900 ${item.span}`}
    >
      <Magnetic className="block w-full h-full" strength={0.06}>
        <div ref={ref} className="group relative w-full h-full overflow-hidden">
          <motion.div className="relative w-full h-full" style={{ scale: scrollScale }}>
            <motion.div
              className="relative w-full h-full"
              whileHover={reduceMotion ? undefined : { scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover grayscale-[0.15]"
              />
            </motion.div>
          </motion.div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="pointer-events-none absolute top-3 left-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/80 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
            {item.season}
          </span>
          <span className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.15em] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            {item.caption}
          </span>
        </div>
      </Magnetic>
    </motion.div>
  );
}

export function Lookbook() {
  return (
    <section className="py-16 sm:py-24 bg-background text-foreground">
      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10%' }}
        className="px-4 sm:px-6 mb-10 flex items-end justify-between flex-wrap gap-3"
      >
        <motion.div variants={fadeUp} className="max-w-md">
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-[0.2em]">// Fit Check</span>
          <h2 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight mt-2 leading-[0.95]">
            Así se lleva<br />en la calle.
          </h2>
        </motion.div>
        <p className="text-xs text-zinc-500 max-w-xs">
          Dos temporadas, una comunidad — Night Runs y Concrete Heat.
        </p>
      </motion.div>

      <div className="grid grid-cols-4 sm:grid-cols-6 auto-rows-[14rem] sm:auto-rows-[16rem] grid-flow-dense gap-1">
        {ITEMS.map((item, i) => (
          <LookbookTile key={item.src} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
