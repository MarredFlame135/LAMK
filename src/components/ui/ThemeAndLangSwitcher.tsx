// src/components/ui/ThemeAndLangSwitcher.tsx

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export function ThemeAndLangSwitcher() {
  const { lang, setLang, isDarkMode, toggleTheme } = useApp();

  return (
    <div className="flex items-center gap-2 p-1 bg-zinc-900/80 border border-zinc-800 rounded-full font-mono text-[11px]">

      {/* Toggle Idioma (ES / EN) — cambia de verdad el diccionario global (i18n.ts) */}
      <button
        onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
        className="px-2 py-0.5 rounded-full bg-black text-amber-400 font-bold hover:scale-105 transition"
      >
        🌐 {lang}
      </button>

      {/* Toggle Modo Oscuro / Claro */}
      <button
        onClick={toggleTheme}
        className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 hover:text-white transition flex items-center gap-1"
        title="Alternar Modo Oscuro / Claro"
      >
        {isDarkMode ? '🌙 DARK' : '☀️ LIGHT'}
      </button>

    </div>
  );
}
