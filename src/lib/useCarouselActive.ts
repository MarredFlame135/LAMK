// src/lib/useCarouselActive.ts
//
// Detecta qué tarjeta de un carrusel horizontal con scroll-snap está
// centrada — para el efecto "pop-out" de Hyped Kicks (dispara con scroll
// real en móvil, no solo con :hover). Un solo hook compartido por las 3
// versiones de Home; cada una decora la tarjeta activa con su propio estilo.

'use client';

import { useEffect, useRef, useState } from 'react';

export function useCarouselActive<TItem extends HTMLElement = HTMLElement>(itemCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(TItem | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!('IntersectionObserver' in window)) {
      setActiveIndex(0);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio <= 0.6) return;
          const idx = itemRefs.current.findIndex((el) => el === entry.target);
          if (idx !== -1) setActiveIndex(idx);
        });
      },
      { root: container, threshold: [0, 0.6, 1], rootMargin: '0px -16% 0px -16%' }
    );

    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [itemCount]);

  const setItemRef = (index: number) => (el: TItem | null) => {
    itemRefs.current[index] = el;
  };

  return { containerRef, setItemRef, activeIndex };
}
