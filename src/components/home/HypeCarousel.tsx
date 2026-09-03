// src/components/home/HypeCarousel.tsx
//
// Reusa la tarjeta "Vitrina de Museo" (ProductCard) en vez de tener su
// propio markup de tarjeta duplicado — así el rediseño HUD vive en un solo
// lugar y este carrusel lo hereda automáticamente.
//
// Fix (auditoría 2026-08-27, hallazgo #3): esto renderizaba el catálogo
// COMPLETO sin límite (265 productos reales) — hidratación gigante, y la
// causa directa de que 265 precios llegaran en $0 al HTML servido (ver
// fix de CountUp.tsx). Un carrusel "trending" con 265 tarjetas no es
// curaduría, es el catálogo entero disfrazado.

'use client';

import React from 'react';
import { Product, ProductVariant } from '@/types/product';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CarouselItemTracker } from '@/components/analytics/CarouselItemTracker';
import { DepthStrip } from '@/components/ui/DepthStrip';

const CAROUSEL_NAME = 'hype_carousel';

const HOME_CURATED_LIMIT = 14;

interface HypeCarouselProps {
  products: Product[];
}

export function HypeCarousel({ products }: HypeCarouselProps) {
  const { addItem } = useCart();
  // Curado: solo lo que de verdad está en tendencia, con tope duro.
  const trendingProducts = [...products]
    .filter((p) => !p.isSoldOut)
    .sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)
    .slice(0, HOME_CURATED_LIMIT);

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    addItem(product.title, product.id, product.images[0], variant);
  };

  return (
    <section className="py-12 bg-background text-foreground border-y border-border">
      <div className="max-w-7xl mx-auto px-4">

        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-[0.2em]">Terminal // Most Wanted</span>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-1">TRENDING & HYPE DROPS</h2>
          </div>
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-[0.15em]">Live Index</span>
        </div>

        {/* La repisa. Se mueve sola con profundidad 3D real — ver DepthStrip.tsx
            para el porqué del efecto y del vaivén.

            Nota sobre el `snap-x snap-mandatory` que había aquí (fix del
            hallazgo #4 de la Fase 6): se retiró. El enganche por CSS y una
            deriva continua se pelean — el navegador corrige la posición hacia
            el punto de anclaje mientras el bucle la mueve, y el resultado es
            un tirón por cada frame. El scroll sigue siendo nativo (se arrastra,
            rueda y se recorre con teclado); lo único que se fue es el imán. */}
        <DepthStrip label="el carrusel de drops en tendencia">
          {trendingProducts.map((product, idx) => (
            <CarouselItemTracker
              key={product.id}
              carouselName={CAROUSEL_NAME}
              position={idx}
              className="flex-none w-72"
            >
              <ProductCard product={product} index={idx} onAddToCart={handleAddToCart} />
            </CarouselItemTracker>
          ))}
        </DepthStrip>

      </div>
    </section>
  );
}
