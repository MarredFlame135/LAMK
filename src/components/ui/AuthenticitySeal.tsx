// src/components/ui/AuthenticitySeal.tsx
//
// "LAMK Authenticity Seal" — bloque de alta confianza para ficha de producto
// y footer. El badge es geometría pura (SVG, sin emoji): un anillo con una
// marca de verificación trazada a mano, en el mismo lenguaje visual que el
// resto de la vitrina (mono, tracking ancho, mayúsculas).

import React from 'react';

interface AuthenticitySealProps {
  compact?: boolean;
}

function SealMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="18.5" stroke="#C5A059" strokeWidth="1" />
      <circle cx="20" cy="20" r="14.5" stroke="#C5A059" strokeWidth="0.5" opacity="0.5" />
      <path d="M12 20.5L17.5 26L28.5 14" stroke="#FF1E42" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function AuthenticitySeal({ compact = false }: AuthenticitySealProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 text-zinc-400">
        <SealMark size={22} />
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] leading-relaxed">
          100% Authenticated Physical Asset · Verified by LAMK MX Verification Protocol
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
      <SealMark size={40} />
      <div>
        <p className="text-xs font-bold font-mono uppercase tracking-[0.15em] text-foreground">
          100% Authenticated Physical Asset
        </p>
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-400 mt-1">
          Verified by Look At My Kicks MX Verification Protocol
        </p>
      </div>
    </div>
  );
}
