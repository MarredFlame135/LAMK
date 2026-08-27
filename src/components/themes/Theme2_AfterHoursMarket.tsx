// src/components/themes/Theme2_AfterHoursMarket.tsx
//
// Versión 2 — "After Hours Market": híbrido StockX (densidad de datos) /
// A Ma Manière (editorial en calma). Reemplaza a la antigua "Volumetric
// Studio" en la ronda de pitch 2026-08-27 — ver ThemeVariantContext.tsx.
// Todas las cifras de "mercado" (índice, vistas, descuentos) son agregados
// reales sobre `products`, nunca inventados — ver notas en MarketTicker y
// Theme2Hero. Reutiliza SocialProofSection sin cambios.

import React from 'react';
import { Product } from '@/types/product';
import { MarketTicker } from './theme2/MarketTicker';
import { Theme2Hero } from './theme2/Theme2Hero';
import { TradingFloorCarousel } from './theme2/TradingFloorCarousel';
import { EditorialSpotlight } from './theme2/EditorialSpotlight';
import { SocialProofSection } from '@/components/home/SocialProofSection';

interface Theme2Props {
  products: Product[];
}

export function Theme2_AfterHoursMarket({ products }: Theme2Props) {
  const hyped = [...products]
    .filter((p) => !p.isSoldOut)
    .sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)
    .slice(0, 6);

  return (
    <>
      <MarketTicker products={hyped} />
      <Theme2Hero products={products} />
      <TradingFloorCarousel products={hyped} />
      <EditorialSpotlight product={hyped[0]} />
      <SocialProofSection products={products} />
    </>
  );
}
