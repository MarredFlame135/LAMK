// src/components/ui/count-up.tsx
//
// Número que cuenta hacia arriba desde 0 cuando entra en el viewport — para
// precios y XP (Core Motion, 5.1). Un solo tween por instancia con
// requestAnimationFrame, sin dependencias extra; se dispara una sola vez
// (viewport once) para no reiniciar cada vez que se hace scroll de ida y vuelta.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface CountUpProps {
  value: number;
  duration?: number;     // ms
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({ value, duration = 900, prefix = '', suffix = '', className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic — arranca rápido, se asienta suave (mismo espíritu que EASE_LUXURY)
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, value, duration]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </motion.span>
  );
}
