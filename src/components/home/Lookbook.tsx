// src/components/home/Lookbook.tsx
//
// "Fit Check" / Lookbook de modelos — grid editorial asimétrico, borde a
// borde. Las 5 imágenes son placeholders generados con Higgsfield para no
// dejar la sección vacía; reemplázalas por fotografía real del mismo
// tamaño/aspect-ratio en las rutas de abajo — el código no cambia, solo el
// contenido de los archivos:
//
//   public/images/lookbook/modelo-1.png  (retrato, 1536×2048 / 3:4)
//   public/images/lookbook/modelo-2.png  (retrato, 1536×2048 / 3:4)
//   public/images/lookbook/modelo-3.png  (horizontal, 2048×1536 / 4:3)
//   public/images/lookbook/modelo-4.png  (retrato, 1536×2048 / 3:4)
//   public/images/lookbook/modelo-5.png  (horizontal, 2048×1536 / 4:3)
//
// Interacción (ronda "élite UI/UX"): cada tile crece sutilmente (1 → 1.1)
// conforme cruza el viewport en scroll — vía useScroll/useTransform de
// framer-motion, el mismo mecanismo que ScrollMacroBackground.tsx, sin
// GSAP. Al hover se suma un segundo "estallido" de escala en la imagen
// (independiente del scroll-scale, en una capa aparte) y un imán suave
// hacia el cursor (reusa <Magnetic>, ya usado en CTAs del sitio).

'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { Magnetic } from '@/components/ui/Magnetic';

interface LookbookItem {
  src: string;
  alt: string;
  caption: string;
  span: string;
}

const ITEMS: LookbookItem[] = [
  { src: '/images/lookbook/modelo-1.png', alt: 'Fit check — outfit 01', caption: 'Concrete Steps', span: 'col-span-2 row-span-2' },
  { src: '/images/lookbook/modelo-2.png', alt: 'Fit check — outfit 02', caption: 'Raw Wall', span: 'col-span-2' },
  { src: '/images/lookbook/modelo-3.png', alt: 'Fit check — outfit 03', caption: 'Wet Asphalt', span: 'col-span-2' },
  { src: '/images/lookbook/modelo-4.png', alt: 'Fit check — outfit 04', caption: 'Empty Street', span: 'col-span-2 row-span-2' },
  { src: '/images/lookbook/modelo-5.png', alt: 'Fit check — outfit 05', caption: 'Curb Sit', span: 'col-span-2' },
];

function LookbookTile({ item, index }: { item: LookbookItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  // Crece de 1 → 1.1 mientras el tile cruza el viewport (no un salto: sigue
  // el progreso real del scroll, como pidió el brief — "scale: 1.05 a 1.1").
  const scrollScale = useTransform(scrollYProgress, [0, 0.5, 1], reduceMotion ? [1, 1, 1] : [1, 1.1, 1]);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10%' }}
      transition={{ delay: (index % 5) * 0.06 }}
      className={`relative overflow-hidden bg-zinc-900 ${item.span}`}
    >
      <Magnetic className="block w-full h-full" strength={0.06}>
        <div ref={ref} className="group relative w-full h-full overflow-hidden">
          {/* Capa 1: crecimiento atado al scroll */}
          <motion.div className="relative w-full h-full" style={{ scale: scrollScale }}>
            {/* Capa 2: estallido de hover, independiente del scroll */}
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
          Lookbook editorial — cómo combina la comunidad LAMK sus piezas en la vida real.
        </p>
      </motion.div>

      {/* Grid editorial asimétrico, borde a borde (sin padding lateral en el track) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 auto-rows-[14rem] sm:auto-rows-[16rem] gap-1">
        {ITEMS.map((item, i) => (
          <LookbookTile key={item.src} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
