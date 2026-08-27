// src/components/home/DropsCoverflow.tsx

'use client';

import React from 'react';
import { CoverflowCarousel, CoverflowItem } from '@/components/ui/coverflow-carousel';
import { Product } from '@/types/product';

interface DropsCoverflowProps {
  products: Product[];
}

export function DropsCoverflow({ products }: DropsCoverflowProps) {
  // Los 5 pares con mayor demanda real (Hype Score = vistas24h/stock, RF-05)
  const items: CoverflowItem[] = [...products]
    .sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      image: p.images[0] || '/placeholder-sneaker.svg',
      title: p.title,
      subtitle: `$${p.variants[0]?.price.toLocaleString() || '—'} MXN`,
      href: `/product/${p.handle}`,
    }));

  if (items.length === 0) return null;

  return (
    <section className="py-14 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-2">
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">// CURADURÍA LAMK</span>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-1">DROPS PRINCIPALES</h2>
        </div>
        <CoverflowCarousel items={items} />
      </div>
    </section>
  );
}
