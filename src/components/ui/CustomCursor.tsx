// src/components/ui/CustomCursor.tsx
//
// Fix (hallazgo #1 de la auditoría de Fase 6): retirado del layout raíz —
// es exactamente el anti-patrón que el propio brief de la auditoría nombra
// ("cursores personalizados... se leen como portafolio de práctica, no como
// producto"). No comunica nada sobre la marca ni el catálogo, es cromo
// decorativo puro. El archivo se queda (no se borra, "mejorar no
// reescribir") por si se decide retomarlo — solo dejó de montarse.
//
// Cursor a medida (punto + anillo) para todo el sitio — parte de la ronda de
// "subir el nivel visual" 2026-08-27. Se monta una sola vez en el layout raíz
// y usa delegación de eventos (un solo listener en `document`) para saber si
// el cursor está sobre algo interactivo, así no hay que tocar cada botón del
// sitio uno por uno para que reaccione.
//
// Se desactiva solo (nunca se monta) en touch (sin pointer:fine) y respeta
// prefers-reduced-motion — en ambos casos el cursor nativo del sistema sigue
// funcionando normal.

'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const HOVER_SELECTOR = 'a, button, input, select, textarea, [role="button"], [data-cursor-hover]';

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const ringX = useSpring(mx, { stiffness: 260, damping: 24, mass: 0.4 });
  const ringY = useSpring(my, { stiffness: 260, damping: 24, mass: 0.4 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduceMotion) return;
    setEnabled(true);
    document.body.classList.add('cursor-none-active');

    const move = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); };
    const over = (e: MouseEvent) => {
      setHovering(!!(e.target as HTMLElement).closest(HOVER_SELECTOR));
    };
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseover', over);
    return () => {
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.body.classList.remove('cursor-none-active');
    };
  }, [mx, my]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed top-0 left-0 z-[9999] h-1.5 w-1.5 rounded-full pointer-events-none"
        style={{ x: mx, y: my, translateX: '-50%', translateY: '-50%', background: 'var(--accent)' }}
      />
      <motion.div
        aria-hidden
        className={`fixed top-0 left-0 z-[9999] rounded-full border pointer-events-none transition-[width,height,opacity] duration-200 ${
          hovering ? 'h-14 w-14' : 'h-8 w-8'
        }`}
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          borderColor: 'var(--foreground)',
          backgroundColor: hovering ? 'var(--accent)' : 'transparent',
          opacity: hovering ? 0.9 : 0.4,
        }}
      />
    </>
  );
}
