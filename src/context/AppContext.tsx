// src/context/AppContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from '@/lib/i18n';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  t: typeof TRANSLATIONS['ES'];
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const PREFS_KEY = 'lamk_prefs_v1';

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#0A0A0C';
    document.body.style.backgroundColor = '#0A0A0C';
    document.body.style.color = '#F4F4F0';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.backgroundColor = '#EDE7DA';
    document.body.style.backgroundColor = '#EDE7DA';
    document.body.style.color = '#14110E';
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ES');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Restaura idioma/tema guardados por el usuario (persistencia real, no solo visual)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lang) setLangState(parsed.lang);
        if (typeof parsed.isDarkMode === 'boolean') {
          setIsDarkMode(parsed.isDarkMode);
          applyTheme(parsed.isDarkMode);
        }
      }
    } catch (e) {
      console.error('Error al restaurar preferencias:', e);
    }
  }, []);

  const persist = (next: { lang?: Language; isDarkMode?: boolean }) => {
    const current = { lang, isDarkMode, ...next };
    localStorage.setItem(PREFS_KEY, JSON.stringify(current));
  };

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    persist({ lang: newLang });
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    applyTheme(newMode);
    persist({ isDarkMode: newMode });
  };

  const t = TRANSLATIONS[lang];

  return (
    <AppContext.Provider value={{ lang, setLang, isDarkMode, toggleTheme, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
}