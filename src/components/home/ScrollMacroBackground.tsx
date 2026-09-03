// src/components/home/ScrollMacroBackground.tsx
//
// Capa de fondo "atada al scroll" (Tarea 3): la textura macro del sneaker
// (public/assets/hero/sneaker-macro.jpg, generada con Higgsfield) rota,
// escala y se desplaza en función de qué tan lejos se ha scrolleado la
// sección que envuelve — el equivalente de ScrollTrigger `scrub` de GSAP,
// hecho con `useScroll`/`useTransform` de framer-motion (ya es dependencia
// del proyecto, no se agrega ninguna librería nueva). `scrub: 1` en GSAP
// significa "la animación sigue al scroll con 1s de suavizado" — aquí el
// suavizado lo da `useSpring` sobre el progreso crudo del scroll.
//
// Respeta prefers-reduced-motion: si el usuario lo pide, la textura queda
// estática (sin rotar/escalar), solo visible como fondo.
//
// Fix de hidratación (2026-09-02, bug preexistente documentado en CLAUDE.md):
// useReducedMotion() devuelve null en el servidor y el valor real en el
// cliente, así que meter `prefersReducedMotion` directo en los rangos de
// useTransform hacía que el `style` inicial NO coincidiera entre servidor y
// cliente ("Prop `style` did not match"). Solo le pasaba a quien tuviera la
// preferencia activada —que en Windows 11 es mucha más gente de la que uno
// cree, ver la nota de la ronda 2 en CLAUDE.md— y era la misma familia de
// error que ya había tumbado la hidratación completa de la home.
//
// Se aplica el patrón obligatorio del repo: los EFECTOS pueden leer la media
// query cruda; lo que se RENDERIZA pasa por un valor gateado con `mounted`,
// para que el primer render del cliente sea idéntico al del servidor y el
// cambio ocurra después, ya montado.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';

export function ScrollMacroBackground({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // En el servidor y en el PRIMER render del cliente esto es siempre false,
  // así que los rangos de abajo salen idénticos en ambos lados.
  const reducedUI = mounted && prefersReducedMotion;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'], // progreso 0→1 mientras la sección cruza el viewport
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.5 });

  const rotate = useTransform(smoothProgress, [0, 1], reducedUI ? [0, 0] : [-8, 8]);
  const scale = useTransform(smoothProgress, [0, 0.5, 1], reducedUI ? [1.15, 1.15, 1.15] : [1.05, 1.25, 1.05]);
  const translateY = useTransform(smoothProgress, [0, 1], reducedUI ? ['0%', '0%'] : ['-6%', '6%']);
  const opacity = useTransform(smoothProgress, [0, 0.15, 0.85, 1], [0, 0.4, 0.4, 0]);

  return (
    <div ref={sectionRef} className={`relative overflow-hidden ${className}`}>
      <motion.div className="pointer-events-none absolute inset-0" style={{ rotate, scale, y: translateY, opacity }} aria-hidden>
        <Image
          src="/assets/hero/sneaker-macro.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-background/80" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}
