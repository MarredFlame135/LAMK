// src/context/AppContext.tsx
//
// Solo idioma (ES/EN). El tema oscuro/claro ahora lo maneja next-themes
// (ver ThemeProvider en layout.tsx y src/components/ui/theme-toggle.tsx) —
// tener dos sistemas tocando la clase `dark` del <html> al mismo tiempo
// causaba parpadeos, así que se separaron limpiamente.

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from '@/lib/i18n';

interface AppContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof TRANSLATIONS['ES'];
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const PREFS_KEY = 'lamk_prefs_v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ES');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lang) setLangState(parsed.lang);
      }
    } catch (e) {
      console.error('Error al restaurar preferencias:', e);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...parsed, lang: newLang }));
    } catch (e) {
      console.error('Error al guardar preferencias:', e);
    }
  };

  const t = TRANSLATIONS[lang];

  return (
    <AppContext.Provider value={{ lang, setLang, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
}
