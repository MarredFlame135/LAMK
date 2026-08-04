// src/context/AppContext.tsx

'use client';

import React, { createContext, useContext, useState } from 'react';
import { Language, TRANSLATIONS } from '@/lib/i18n';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  t: typeof TRANSLATIONS['ES'];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('ES');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0A0A0C';
      document.body.style.color = '#F4F4F0';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#EDE7DA';
      document.body.style.color = '#14110E';
    }
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