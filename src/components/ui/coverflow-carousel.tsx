// src/components/ui/coverflow-carousel.tsx
//
// Carrusel 3D estilo "Coverflow" (Apple) — la tarjeta activa al frente y
// centrada, las de al lado giradas/escaladas en perspectiva. Navegación por
// clic, flechas de teclado y los botones de control. Usado para "Curaduría
// LAMK" (DropsCoverflow) en la home — la pieza que el cliente pidió
// explícitamente que fuera "la más llamativa" del sitio.
//
// Ronda "el más llamativo" (2026-08-27): se suma resplandor ambiental detrás
// de la tarjeta activa, avance automático quieto (se detiene solo con
// cualquier interacción real: drag, teclado, hover) y una insignia de Hype
// en la tarjeta al frente. Todo respeta prefers-reduced-motion — sin eso,
// el avance automático nunca arranca.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useReducedMotion, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD_PX = 60;
const AUTO_ADVANCE_MS = 4200;

export interface CoverflowItem {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href?: string;
}

interface CoverflowCarouselProps {
  items: CoverflowItem[];
  className?: string;
  // Fix (hallazgo #2 de la auditoría de Fase 5): callbacks opcionales de
  // analítica — la tarjeta que queda al frente/centrada es la señal de
  // "impresión" real de un coverflow (a diferencia de un scroll horizontal,
  // aquí solo una tarjeta está realmente "vista" a la vez); el clic en la
  // tarjeta activa es la única que de verdad navega (las laterales solo
  // recentran, ver más abajo). Opcionales para no romper otros usos futuros
  // de este componente que no necesiten trackear nada.
  onActiveChange?: (item: CoverflowItem, position: number) => void;
  onItemClick?: (item: CoverflowItem, position: number) => void;
}

export function CoverflowCarousel({ items, className, onActiveChange, onItemClick }: CoverflowCarouselProps) {
  const [active, setActive] = useState(Math.min(1, items.length - 1));
  const [isPaused, setIsPaused] = useState(false);
  // Fix (hallazgo #3 de la auditoría de Fase 6): antes el avance automático
  // solo se pausaba con hover/foco/drag — sin control visible, alguien sin
  // mouse sobre la tarjeta (o que simplemente prefiera que no se mueva sola,
  // sin haber cambiado su preferencia de sistema) no tenía forma de
  // detenerlo. `userPaused` es independiente de `isPaused` (que sigue
  // manejando la pausa automática por interacción) — un botón explícito,
  // sin depender de mantener el mouse encima.
  const [userPaused, setUserPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  // Refs para no forzar a quien use estos callbacks a memoizarlos, y para
  // que el efecto de abajo no se re-dispare solo porque el padre volvió a
  // renderizar con una función inline nueva.
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;
  const onItemClickRef = useRef(onItemClick);
  onItemClickRef.current = onItemClick;

  const activeItemId = items[active]?.id;
  useEffect(() => {
    if (!activeItemId) return;
    onActiveChangeRef.current?.(items[active], active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItemId]);

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

  // Avance automático — "que se mueva sola" (pedido del cliente). Se pausa
  // con cualquier señal de que alguien está mirando/interactuando: hover,
  // foco por teclado, o drag en curso. Nunca arranca con reduced-motion.
  useEffect(() => {
    if (reduceMotion || isPaused || userPaused || items.length <= 1) return;
    const id = setInterval(() => goTo(active + 1), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [active, isPaused, userPaused, reduceMotion, items.length, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const isTyping = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
      if (isTyping) return; // no secuestrar flechas mientras se escribe en otro campo del sitio
      if (e.key === 'ArrowLeft') { setIsPaused(true); goTo(active - 1); }
      if (e.key === 'ArrowRight') { setIsPaused(true); goTo(active + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, goTo]);

  if (items.length === 0) return null;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD_PX) goTo(active + 1);
    else if (info.offset.x >= SWIPE_THRESHOLD_PX) goTo(active - 1);
  };

  const activeItem = items[active];

  return (
    <div
      className={cn('relative w-full', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Resplandor ambiental detrás de la tarjeta activa — el "spotlight"
          que hace que el carrusel se sienta como una vitrina, no una lista */}
      {!reduceMotion && (
        <motion.div
          key={activeItem.id}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="w-[26rem] h-[26rem] rounded-full bg-[#FF1E42]/15 blur-[90px]" />
          <div className="absolute w-72 h-72 rounded-full bg-[#C5A059]/10 blur-[70px]" />
        </motion.div>
      )}

      {/* Capa de arrastre táctil — todo el ancho, se resetea con spring si no cruza el umbral */}
      <motion.div
        drag="x"
        dragElastic={0.15}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => setIsPaused(true)}
        onDragEnd={handleDragEnd}
        className="relative h-[24rem] sm:h-[28rem] flex items-center justify-center overflow-x-hidden [perspective:1200px] cursor-grab active:cursor-grabbing touch-pan-y"
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
                x: offset * 170,
                zIndex: 10 - abs,
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <motion.a
                href={item.href || '#'}
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault();
                    setIsPaused(true);
                    goTo(idx);
                  } else {
                    onItemClickRef.current?.(item, idx);
                  }
                }}
                animate={{
                  scale: isActive ? 1 : 0.72,
                  rotateY: isActive ? undefined : offset * -35,
                  opacity: abs > 2 ? 0 : 1 - abs * 0.25,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                onMouseMove={isActive ? handleTiltMove : undefined}
                onMouseLeave={isActive ? handleTiltLeave : undefined}
                className="relative w-60 sm:w-72 aspect-[3/4] rounded-2xl overflow-hidden border border-border bg-card shadow-2xl cursor-pointer"
                style={{
                  transformStyle: 'preserve-3d',
                  rotateX: isActive ? springTiltX : undefined,
                  rotateY: isActive ? springTiltY : undefined,
                  boxShadow: isActive ? '0 30px 70px -20px rgba(255,30,66,0.35)' : undefined,
                }}
              >
                <Image src={item.image} alt={item.title} fill sizes="288px" className="object-cover" draggable={false} priority={isActive} />

                {item.badge && isActive && (
                  <span className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-mono font-bold text-[#FF1E42] uppercase tracking-wide">
                    {item.badge}
                  </span>
                )}

                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
                  <h3 className={cn('text-white font-black uppercase tracking-wide line-clamp-1', isActive ? 'text-sm' : 'text-xs')}>{item.title}</h3>
                  {item.subtitle && <p className={cn('text-[#C5A059] font-mono mt-0.5', isActive ? 'text-xs' : 'text-[10px]')}>{item.subtitle}</p>}
                </div>
              </motion.a>

              {/* Reflejo inferior — solo en la tarjeta activa, para no saturar visualmente el resto */}
              {isActive && (
                <div
                  aria-hidden
                  className="relative w-60 sm:w-72 aspect-[3/4] mt-1 rounded-2xl overflow-hidden pointer-events-none select-none"
                  style={{
                    transform: 'scaleY(-1)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 55%)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 55%)',
                  }}
                >
                  <Image src={item.image} alt="" fill sizes="288px" className="object-cover" draggable={false} />
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={() => { setIsPaused(true); goTo(active - 1); }}
          aria-label="Anterior"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-border text-zinc-300 hover:border-red-600/60 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => { setIsPaused(true); goTo(idx); }}
              aria-label={`Ir a ${item.title}`}
              className={cn('h-1.5 rounded-full transition-all', idx === active ? 'w-6 bg-[#FF1E42]' : 'w-1.5 bg-zinc-700')}
            />
          ))}
        </div>
        <button
          onClick={() => { setIsPaused(true); goTo(active + 1); }}
          aria-label="Siguiente"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-border text-zinc-300 hover:border-red-600/60 hover:text-white transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Fix (hallazgo #3 de la auditoría de Fase 6): control explícito,
            no depende de mantener el mouse encima. Sin autoplay que pausar
            (reduced-motion o una sola tarjeta), no tiene sentido mostrarlo. */}
        {!reduceMotion && items.length > 1 && (
          <button
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? 'Reanudar avance automático' : 'Pausar avance automático'}
            aria-pressed={userPaused}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-border text-zinc-300 hover:border-red-600/60 hover:text-white transition"
          >
            {userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
