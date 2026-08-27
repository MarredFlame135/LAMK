// src/components/themes/ThemeVariantContext.tsx
//
// Fase 5 — las 3 versiones del frontend que el cliente puede elegir. Esto es
// DISTINTO del modo claro/oscuro (next-themes, ver ThemeProvider en layout.tsx):
// aquí se elige qué LAYOUT/estilo visual completo se renderiza en Home, no si
// los colores son oscuros o claros — ambos sistemas conviven, cada tema puede
// verse en claro u oscuro.
//
// Ronda de pitch 2026-08-27: se reemplazaron las 3 versiones anteriores
// (Hype Asphalt / Volumetric Studio / Luxury Editorial) por las 3 propuestas
// nuevas que el cliente va a comparar (Ink & Static / After Hours Market /
// The Wall) — mismo mecanismo de selección, identidad visual nueva. La clave
// de localStorage sube a v2 para no restaurar por accidente un valor viejo
// que ya no existe.
//
// Por ahora la elección real de layout solo aplica a la Home (ver
// HomeThemeRouter.tsx); el resto del sitio (catálogo, ficha, bóveda) sigue
// usando su diseño único mientras no se extienda el sistema a esas páginas.

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeVariant = 'INK_STATIC' | 'AFTER_HOURS' | 'THE_WALL';

export const THEME_VARIANT_META: Record<ThemeVariant, { label: string; description: string }> = {
  INK_STATIC: { label: 'INK & STATIC', description: 'Cómic retro, papel envejecido, alto contraste rojo/beige' },
  AFTER_HOURS: { label: 'AFTER HOURS MARKET', description: 'Mercado en vivo, densidad de datos, editorial en calma' },
  THE_WALL: { label: 'THE WALL', description: 'Brutalismo callejero, blanco/negro puro, cero radios' },
};

interface ThemeVariantContextType {
  variant: ThemeVariant;
  setVariant: (v: ThemeVariant) => void;
}

const ThemeVariantContext = createContext<ThemeVariantContextType | undefined>(undefined);
const STORAGE_KEY = 'lamk_theme_variant_v2';

export function ThemeVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariantState] = useState<ThemeVariant>('INK_STATIC');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'INK_STATIC' || saved === 'AFTER_HOURS' || saved === 'THE_WALL') {
        setVariantState(saved);
      }
    } catch (e) {
      console.error('Error al restaurar el tema visual elegido:', e);
    }
  }, []);

  const setVariant = (v: ThemeVariant) => {
    setVariantState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch (e) {
      console.error('Error al guardar el tema visual elegido:', e);
    }
  };

  return (
    <ThemeVariantContext.Provider value={{ variant, setVariant }}>
      {children}
    </ThemeVariantContext.Provider>
  );
}

export function useThemeVariant() {
  const context = useContext(ThemeVariantContext);
  if (!context) throw new Error('useThemeVariant debe usarse dentro de ThemeVariantProvider');
  return context;
}
