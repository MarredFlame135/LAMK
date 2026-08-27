// src/components/themes/ThemeSwitcher.tsx
//
// Selector de las 3 versiones del frontend (Fase 5). Pill de 3 posiciones,
// mismo lenguaje visual que ThemeAndLangSwitcher para que convivan en el Hero.

'use client';

import React from 'react';
import { useThemeVariant, THEME_VARIANT_META, ThemeVariant } from './ThemeVariantContext';

const ORDER: ThemeVariant[] = ['INK_STATIC', 'AFTER_HOURS', 'THE_WALL'];

export function ThemeSwitcher() {
  const { variant, setVariant } = useThemeVariant();

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-900/80 border border-zinc-800">
      {ORDER.map((v, idx) => (
        <button
          key={v}
          onClick={() => setVariant(v)}
          title={THEME_VARIANT_META[v].description}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider transition ${
            variant === v ? 'bg-[#FF1E42] text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {idx + 1}
        </button>
      ))}
    </div>
  );
}
