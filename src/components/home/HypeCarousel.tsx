// src/components/home/HypeCarousel.tsx
//
// Reusa la tarjeta "Vitrina de Museo" (ProductCard) en vez de tener su
// propio markup de tarjeta duplicado — así el rediseño HUD vive en un solo
// lugar y este carrusel lo hereda automáticamente.

'use client';

import React from 'react';
import { Product, ProductVariant } from '@/types/product';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/catalog/ProductCard';

interface HypeCarouselProps {
  products: Product[];
}

export function HypeCarousel({ products }: HypeCarouselProps) {
  const { addItem } = useCart();
  // Ordenar productos por el score de Hype Meter de mayor a menor
  const trendingProducts = [...products].sort((a, b) => b.hypeMeter.score - a.hypeMeter.score);

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
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.15em]">Live Index</span>
        </div>

        {/* Carrusel Deslizable */}
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {trendingProducts.map((product, idx) => (
            <div key={product.id} className="flex-none w-72">
              <ProductCard product={product} index={idx} onAddToCart={handleAddToCart} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
