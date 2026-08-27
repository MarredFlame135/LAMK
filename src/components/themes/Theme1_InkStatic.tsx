// src/components/themes/Theme1_InkStatic.tsx
//
// Versión 1 — "Ink & Static": identidad de cómic impreso (rojo/beige/grises,
// halftone, sombras sólidas). Reemplaza a la antigua "Hype Asphalt" en la
// ronda de pitch 2026-08-27 — ver ThemeVariantContext.tsx. Reutiliza
// SocialProofSection sin cambios: las reseñas reales no son una decisión de
// estilo, son contenido real, igual que en las otras 2 versiones.

import React from 'react';
import { Product } from '@/types/product';
import { Theme1Hero } from './theme1/Theme1Hero';
import { HypedKicksCarousel } from './theme1/HypedKicksCarousel';
import { SocialProofSection } from '@/components/home/SocialProofSection';

interface Theme1Props {
  products: Product[];
}

export function Theme1_InkStatic({ products }: Theme1Props) {
  const hyped = [...products]
    .filter((p) => !p.isSoldOut)
    .sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)
    .slice(0, 6);

  return (
    <>
      <Theme1Hero />
      <HypedKicksCarousel products={hyped} />
      <SocialProofSection products={products} />
    </>
  );
}
