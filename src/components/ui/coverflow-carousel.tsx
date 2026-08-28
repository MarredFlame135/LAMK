// src/components/ui/coverflow-carousel.tsx
//
// Carrusel 3D estilo "Coverflow" (Apple) — la tarjeta activa al frente y
// centrada, las de al lado giradas/escaladas en perspectiva. Navegación por
// clic, flechas de teclado y los botones de control. Usado para "Curaduría
// LAMK" (DropsCoverflow) en la home.
//
// Fix (ronda "élite UI/UX"): dos problemas reales encontrados al revisar
// este componente —
//   1) Importaba de 'motion/react' (el paquete standalone "Motion") en vez
//      de 'framer-motion', que es lo que usa el resto del sitio — dos
//      librerías de animación cargadas en paralelo, riesgo de bundle
//      duplicado. Se unifica a 'framer-motion'.
//   2) El listener de teclado estaba en `window` sin condición: las flechas
//      izquierda/derecha movían este carrusel aunque el foco estuviera en
//      CUALQUIER input del sitio (buscador del catálogo, campos del
//      carrito, etc.) — ahora se ignora si hay un campo de texto enfocado.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD_PX = 60;

export interface CoverflowItem {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  href?: string;
}

interface CoverflowCarouselProps {
  items: CoverflowItem[];
  className?: string;
}

export function CoverflowCarousel({ items, className }: CoverflowCarouselProps) {
  const [active, setActive] = useState(Math.min(1, items.length - 1));

  // Tilt 3D suave en la tarjeta activa, siguiendo el cursor — el detalle que
  // hace que esto se sienta "galería de arte interactiva" y no un slider
  // genérico. Solo aplica a la tarjeta activa (las demás ya tienen su
  // propio rotateY de perspectiva).
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springTiltX = useSpring(tiltX, { stiffness: 200, damping: 20 });
  const springTiltY = useSpring(tiltY, { stiffness: 200, damping: 20 });

  const handleTiltMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tiltY.set(px * 14);
    tiltX.set(py * -14);
  };
  const handleTiltLeave = () => { tiltX.set(0); tiltY.set(0); };

  const goTo = useCallback((idx: number) => {
    setActive(((idx % items.length) + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const isTyping = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
      if (isTyping) return; // no secuestrar flechas mientras se escribe en otro campo del sitio
      if (e.key === 'ArrowLeft') goTo(active - 1);
      if (e.key === 'ArrowRight') goTo(active + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, goTo]);

  if (items.length === 0) return null;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD_PX) goTo(active + 1);
    else if (info.offset.x >= SWIPE_THRESHOLD_PX) goTo(active - 1);
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Capa de arrastre táctil — todo el ancho, se resetea con spring si no cruza el umbral */}
      <motion.div
        drag="x"
        dragElastic={0.15}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative h-[23rem] sm:h-[27rem] flex items-center justify-center overflow-x-hidden [perspective:1200px] cursor-grab active:cursor-grabbing touch-pan-y"
      >
        {items.map((item, idx) => {
          const offset = idx - active;
          const isActive = offset === 0;
          const abs = Math.abs(offset);
          if (abs > 2) return null; // no renderizar tarjetas muy lejanas

          return (
            <motion.div
              key={item.id}
              animate={{
                x: offset * 160,
                zIndex: 10 - abs,
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="absolute flex flex-col items-center"
            >
              <motion.a
                href={item.href || '#'}
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault();
                    goTo(idx);
                  }
                }}
                animate={{
                  scale: isActive ? 1 : 0.75,
                  rotateY: isActive ? undefined : offset * -35,
                  opacity: abs > 2 ? 0 : 1 - abs * 0.25,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                onMouseMove={isActive ? handleTiltMove : undefined}
                onMouseLeave={isActive ? handleTiltLeave : undefined}
                className="relative w-56 sm:w-64 aspect-[3/4] rounded-2xl overflow-hidden border border-border bg-card shadow-2xl cursor-pointer"
                style={{
                  transformStyle: 'preserve-3d',
                  rotateX: isActive ? springTiltX : undefined,
                  rotateY: isActive ? springTiltY : undefined,
                }}
              >
                <Image src={item.image} alt={item.title} fill sizes="256px" className="object-cover" draggable={false} />
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
                  <h3 className="text-white text-xs font-black uppercase tracking-wide line-clamp-1">{item.title}</h3>
                  {item.subtitle && <p className="text-[10px] text-[#C5A059] font-mono mt-0.5">{item.subtitle}</p>}
                </div>
              </motion.a>

              {/* Reflejo inferior — solo en la tarjeta activa, para no saturar visualmente el resto */}
              {isActive && (
                <div
                  aria-hidden
                  className="relative w-56 sm:w-64 aspect-[3/4] mt-1 rounded-2xl overflow-hidden pointer-events-none select-none"
                  style={{
                    transform: 'scaleY(-1)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 55%)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 55%)',
                  }}
                >
                  <Image src={item.image} alt="" fill sizes="256px" className="object-cover" draggable={false} />
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={() => goTo(active - 1)}
          aria-label="Anterior"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-border text-zinc-300 hover:border-red-600/60 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => goTo(idx)}
              aria-label={`Ir a ${item.title}`}
              className={cn('h-1.5 rounded-full transition-all', idx === active ? 'w-6 bg-[#FF1E42]' : 'w-1.5 bg-zinc-700')}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(active + 1)}
          aria-label="Siguiente"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-border text-zinc-300 hover:border-red-600/60 hover:text-white transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
