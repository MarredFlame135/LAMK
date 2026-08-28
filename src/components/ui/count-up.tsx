// src/components/ui/count-up.tsx
//
// Número que cuenta hacia arriba desde 0 cuando entra en el viewport — para
// precios y XP (Core Motion, 5.1).
//
// Fix (auditoría 2026-08-27, hallazgo #2): antes arrancaba en `useState(0)`
// y solo se actualizaba en un useEffect — el HTML SERVIDO (SSR, curl,
// Google, preview de WhatsApp/Meta, o cualquier usuario con JS lento)
// mostraba literalmente "MXN 0" en cada precio. Confirmado en producción:
// 265 instancias de "MXN 0" en el HTML real del home.
//
// Ahora el valor REAL es siempre lo primero que se renderiza (servidor y
// cliente coinciden en el primer render — sin hydration mismatch). El
// conteo-desde-cero es puramente cosmético y solo corre si: hay JS, el
// usuario no pidió reduced motion, Y el elemento entra en viewport DESPUÉS
// del montaje — si ya estaba visible al cargar la página, no se anima (eso
// causaría un salto visible: valor real → 0 → valor real de nuevo).

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;     // ms
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({ value, duration = 900, prefix = '', suffix = '', className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    // Reduced motion → se queda en el valor real, sin animación. El sitio
    // debe ser 100% comprable así (regla del presupuesto de rendimiento).
    if (prefersReducedMotion) return;

    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    // Ya visible al montar (arriba del pliegue) — no animar. Evita el salto
    // visible de "valor real" a "0" y de vuelta en contenido que el usuario
    // ya está viendo en el primer frame.
    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (alreadyVisible) return;

    let raf: number;
    const animateFromZero = () => {
      setDisplay(0);
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        // ease-out cubic — arranca rápido, se asienta suave (mismo espíritu que EASE_LUXURY)
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(value * eased));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animateFromZero();
          observer.disconnect();
        }
      },
      { rootMargin: '-10% 0px' }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [prefersReducedMotion, value, duration]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </motion.span>
  );
}
