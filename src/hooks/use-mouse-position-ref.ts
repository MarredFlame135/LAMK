// src/hooks/use-mouse-position-ref.ts
//
// Rastrea la posición del mouse en un ref (sin re-render en cada movimiento)
// relativa a un contenedor opcional. Usado por parallax-floating.tsx.

'use client';

import { useEffect, useRef, RefObject } from 'react';

export interface MousePosition {
  x: number;
  y: number;
}

export function useMousePositionRef(containerRef?: RefObject<HTMLElement>) {
  const positionRef = useRef<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (x: number, y: number) => {
      const container = containerRef?.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        positionRef.current = { x: x - rect.left - rect.width / 2, y: y - rect.top - rect.height / 2 };
      } else {
        positionRef.current = { x, y };
      }
    };

    const handleMouseMove = (e: MouseEvent) => updatePosition(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}
