// src/components/themes/Theme3_TheWall.tsx
//
// Versión 3 — "The Wall": brutalismo callejero estilo Grailed (blanco/negro
// puro, cero radios, grid asimétrica). Reemplaza a la antigua "Luxury
// Editorial" en la ronda de pitch 2026-08-27 — ver ThemeVariantContext.tsx.
// Reutiliza SocialProofSection sin cambios.

import React from 'react';
import { Product } from '@/types/product';
import { Theme3Hero } from './theme3/Theme3Hero';
import { TheWallCarousel } from './theme3/TheWallCarousel';
import { CollectionsWall } from './theme3/CollectionsWall';
import { SocialProofSection } from '@/components/home/SocialProofSection';

interface Theme3Props {
  products: Product[];
}

export function Theme3_TheWall({ products }: Theme3Props) {
  const hyped = [...products]
    .filter((p) => !p.isSoldOut)
    .sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)
    .slice(0, 6);

  return (
    <>
      <Theme3Hero />
      <TheWallCarousel products={hyped} />
      <CollectionsWall products={products} />
      <SocialProofSection products={products} />
    </>
  );
}
