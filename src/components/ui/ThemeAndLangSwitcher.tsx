// src/components/ui/ThemeAndLangSwitcher.tsx

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { ThemeToggle } from './theme-toggle';

export function ThemeAndLangSwitcher() {
  const { lang, setLang } = useApp();

  return (
    <div className="flex items-center gap-2">
      {/* Toggle Idioma (ES / EN) — cambia de verdad el diccionario global (i18n.ts) */}
      <button
        onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
        className="px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-amber-400 font-bold font-mono text-[11px] hover:scale-105 transition"
      >
        {lang}
      </button>

      {/* Light / Dark / System real vía next-themes */}
      <ThemeToggle />
    </div>
  );
}
