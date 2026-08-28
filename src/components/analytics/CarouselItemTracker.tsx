// src/components/analytics/CarouselItemTracker.tsx
//
// Fix (hallazgo #2 de la auditoría de Fase 5): el brief pide impresión +
// clic por posición para los carruseles de home — esto es lo que alimenta
// directo la Fase 6 (¿la gente pasa de la primera tarjeta o no?). Envuelve
// cada tarjeta de un carrusel horizontal (HypeCarousel) sin tocar
// ProductCard —que no sabe si está dentro de un carrusel o de una grilla
// normal, y no debería tener que saberlo—.
//
// Impresión: IntersectionObserver, se dispara una sola vez cuando la
// tarjeta cruza 50% de visibilidad. Clic: onClickCapture (fase de
// captura) — no interfiere con el onClick real de la tarjeta (agregar al
// carrito, ir a la ficha), solo observa que ocurrió.

'use client';

import React, { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';

interface CarouselItemTrackerProps {
  carouselName: string;
  position: number;
  children: React.ReactNode;
  className?: string;
}

export function CarouselItemTracker({ carouselName, position, children, className }: CarouselItemTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const firedImpression = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !firedImpression.current) {
          firedImpression.current = true;
          track('carousel_impression', { carouselName, position });
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [carouselName, position]);

  return (
    <div
      ref={ref}
      className={className}
      onClickCapture={() => track('carousel_click', { carouselName, position })}
    >
      {children}
    </div>
  );
}
