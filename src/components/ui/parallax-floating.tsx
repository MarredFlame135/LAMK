// src/components/ui/parallax-floating.tsx
//
// `Floating` envuelve un contenedor y comparte la posición del mouse (vía
// contexto) con sus `FloatingElement` hijos, que se desplazan en paralaje
// según su `depth` (más profundidad = más movimiento). Usado en el Hero
// alrededor de la tarjeta de TENISIN para el efecto interactivo con el cursor.

'use client';

import React, { createContext, useContext, useRef, ReactNode } from 'react';
// Fix (hallazgo #5 de la auditoría de Fase 3): usaba el paquete standalone
// `motion` en vez de `framer-motion` (que ya es el estándar del resto del
// proyecto, 25 archivos) — dos motores de animación cargando en la misma
// página (Home, vía HeroSection). La API es la misma.
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import { useMousePositionRef } from '@/hooks/use-mouse-position-ref';

interface FloatingContextValue {
  mouseRef: ReturnType<typeof useMousePositionRef>;
}

const FloatingContext = createContext<FloatingContextValue | null>(null);

interface FloatingProps {
  children: ReactNode;
  className?: string;
  sensitivity?: number; // qué tanto reacciona al mouse, default 0.05
}

export function Floating({ children, className = '', sensitivity = 0.05 }: FloatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useMousePositionRef(containerRef as React.RefObject<HTMLElement>);

  return (
    <FloatingContext.Provider value={{ mouseRef }}>
      <div ref={containerRef} className={className} style={{ position: 'relative' }} data-sensitivity={sensitivity}>
        {children}
      </div>
    </FloatingContext.Provider>
  );
}

interface FloatingElementProps {
  children: ReactNode;
  depth?: number; // 1 = normal, 2 = el doble de movimiento, etc.
  className?: string;
}

export function FloatingElement({ children, depth = 1, className = '' }: FloatingElementProps) {
  const ctx = useContext(FloatingContext);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useTransform(x, (v) => v);
  const springY = useTransform(y, (v) => v);

  useAnimationFrame(() => {
    if (!ctx) return;
    const { x: mx, y: my } = ctx.mouseRef.current;
    const factor = 0.03 * depth;
    x.set(x.get() + (mx * factor - x.get()) * 0.1);
    y.set(y.get() + (my * factor - y.get()) * 0.1);
  });

  return (
    <motion.div className={className} style={{ x: springX, y: springY, position: 'absolute' }}>
      {children}
    </motion.div>
  );
}
