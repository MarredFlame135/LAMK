// src/components/themes/HomeThemeRouter.tsx
//
// Lee la versión elegida (ThemeVariantContext) y decide cuál de los 3 ya
// renderizados mostrar. Recibe los 3 temas como ReactNode YA RENDERIZADOS
// por el Server Component (page.tsx) en vez de importarlos e instanciarlos
// aquí — algunos temas usan APIs server-only (ej. SocialProofSection lee
// reviews-store.ts) porque son Server Components de verdad, y ese código no
// puede entrar al bundle de cliente. Este es el patrón oficial de Next.js
// para intercalar Server Components dentro de un Client Component: pasarlos
// como props/children ya renderizados, nunca importarlos directamente desde
// un archivo 'use client'.

'use client';

import React from 'react';
import { useThemeVariant } from './ThemeVariantContext';

interface HomeThemeRouterProps {
  theme1: React.ReactNode;
  theme2: React.ReactNode;
  theme3: React.ReactNode;
}

export function HomeThemeRouter({ theme1, theme2, theme3 }: HomeThemeRouterProps) {
  const { variant } = useThemeVariant();

  switch (variant) {
    case 'AFTER_HOURS':
      return <>{theme2}</>;
    case 'THE_WALL':
      return <>{theme3}</>;
    case 'INK_STATIC':
    default:
      return <>{theme1}</>;
  }
}
