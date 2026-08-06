// src/components/ui/coverflow-carousel.tsx
//
// Carrusel 3D estilo "Coverflow" (Apple) — la tarjeta activa al frente y
// centrada, las de al lado giradas/escaladas en perspectiva. Navegación por
// clic, flechas de teclado y los botones de control. Usado para los Drops
// principales en la home.

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const goTo = useCallback((idx: number) => {
    setActive(((idx % items.length) + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goTo(active - 1);
      if (e.key === 'ArrowRight') goTo(active + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, goTo]);

  if (items.length === 0) return null;

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative h-80 sm:h-96 flex items-center justify-center [perspective:1200px]">
        {items.map((item, idx) => {
          const offset = idx - active;
          const isActive = offset === 0;
          const abs = Math.abs(offset);
          if (abs > 2) return null; // no renderizar tarjetas muy lejanas

          return (
            <motion.a
              key={item.id}
              href={item.href || '#'}
              onClick={(e) => {
                if (!isActive) {
                  e.preventDefault();
                  goTo(idx);
                }
              }}
              animate={{
                x: offset * 160,
                scale: isActive ? 1 : 0.75,
                rotateY: offset * -35,
                opacity: abs > 2 ? 0 : 1 - abs * 0.25,
                zIndex: 10 - abs,
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="absolute w-56 sm:w-64 aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-800 bg-[#121215] shadow-2xl cursor-pointer"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Image src={item.image} alt={item.title} fill sizes="256px" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
                <h3 className="text-white text-xs font-black uppercase tracking-wide line-clamp-1">{item.title}</h3>
                {item.subtitle && <p className="text-[10px] text-amber-400 font-mono mt-0.5">{item.subtitle}</p>}
              </div>
            </motion.a>
          );
        })}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={() => goTo(active - 1)}
          aria-label="Anterior"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-red-600/60 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => goTo(idx)}
              aria-label={`Ir a ${item.title}`}
              className={cn('h-1.5 rounded-full transition-all', idx === active ? 'w-6 bg-[#E60026]' : 'w-1.5 bg-zinc-700')}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(active + 1)}
          aria-label="Siguiente"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-red-600/60 hover:text-white transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
