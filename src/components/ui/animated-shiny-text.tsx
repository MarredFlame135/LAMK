// src/components/ui/animated-shiny-text.tsx
//
// Texto con un brillo diagonal que recorre el gradiente en loop — usado en
// el título del Hero y en badges VIP para llamar la atención sin ser un GIF.

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  children: React.ReactNode;
  className?: string;
  /** Colores del gradiente [base, base, brillo, base, base]. Default: hueso→dorado. */
  gradient?: [string, string, string];
}

export function AnimatedText({ children, className, gradient }: AnimatedTextProps) {
  const [base, mid, shine] = gradient || ['rgba(237,231,218,0.65)', 'rgba(237,231,218,0.65)', '#E8B84B'];

  return (
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, ${base} 0%, ${mid} 40%, ${shine} 50%, ${mid} 60%, ${base} 100%)`,
        backgroundSize: '200% 100%',
      }}
      className={cn('inline-block bg-clip-text text-transparent animate-shine', className)}
    >
      {children}
    </span>
  );
}
