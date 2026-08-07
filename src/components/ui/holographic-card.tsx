// src/components/ui/holographic-card.tsx
//
// Lámina cromada holográfica: gradiente + tilt 3D que reacciona al mouse en
// desktop y a la inclinación del celular (DeviceOrientation) en mobile.
// Usada en las tarjetas cromadas de la Bóveda del Coleccionista.

'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HolographicCard({ children, className }: HolographicCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  const applyTilt = useCallback((px: number, py: number) => {
    // px/py van de 0 a 1 (posición relativa dentro de la tarjeta)
    const rotateY = (px - 0.5) * 18;
    const rotateX = (0.5 - py) * 18;
    setStyle({
      transform: `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`,
      transition: 'transform 80ms linear',
    });
    setGlarePos({ x: px * 100, y: py * 100 });
  }, []);

  const reset = useCallback(() => {
    setStyle({ transform: 'perspective(700px) rotateX(0) rotateY(0) scale3d(1,1,1)', transition: 'transform 400ms ease-out' });
    setGlarePos({ x: 50, y: 50 });
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    applyTilt((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  // Inclinación del celular (requiere permiso en iOS 13+, se pide al primer toque)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const px = Math.min(1, Math.max(0, 0.5 + e.gamma / 60));
      const py = Math.min(1, Math.max(0, 0.5 + (e.beta - 45) / 60));
      applyTilt(px, py);
    };

    const el = ref.current;
    const requestPermission = async () => {
      const DOE = window.DeviceOrientationEvent as any;
      if (DOE?.requestPermission) {
        try {
          const res = await DOE.requestPermission();
          if (res === 'granted') window.addEventListener('deviceorientation', handleOrientation);
        } catch {
          // usuario no dio permiso — se queda con el hover de mouse nada más
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    el?.addEventListener('touchstart', requestPermission, { once: true });
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      el?.removeEventListener('touchstart', requestPermission);
    };
  }, [applyTilt]);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      className={cn('relative', className)}
    >
      {children}
      {/* Capa de brillo cromado que sigue el cursor/inclinación */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-80"
        style={{
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.65) 0%, rgba(232,184,75,0.35) 25%, rgba(230,0,38,0.25) 45%, transparent 70%)`,
        }}
      />
    </div>
  );
}
