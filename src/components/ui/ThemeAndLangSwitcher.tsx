// src/components/ui/ThemeAndLangSwitcher.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/lib/i18n';

export function ThemeAndLangSwitcher() {
  const [lang, setLang] = useState<Language>('ES');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Alternar Modo Oscuro (Asfalto #0A0A0C) / Modo Claro (Hueso #EDE7DA)
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0A0A0C';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#EDE7DA';
    }
  };

  return (
    <div className="flex items-center gap-2 p-1 bg-zinc-900/80 border border-zinc-800 rounded-full font-mono text-[11px]">
      
      {/* Toggle Idioma (ES / EN) */}
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