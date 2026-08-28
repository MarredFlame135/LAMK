// src/components/home/DropsCoverflow.tsx
//
// "Curaduría LAMK" — el carrusel insignia del home (pedido explícito del
// cliente: "debe ser el mejor, el más llamativo"). Ver coverflow-carousel.tsx
// para las mejoras de vitrina (resplandor, avance automático, insignia).
//
// Curaduría diversificada (2026-08-27): antes era un sort() global por Hype
// score, que en la práctica siempre terminaba siendo puro sneaker (es la
// categoría con más piezas e interacción). Ahora se toma primero la pieza
// con más Hype de CADA categoría disponible, y se rellena el resto con las
// siguientes de mayor Hype — la vitrina refleja todo el catálogo, no solo
// un rincón.

'use client';

import React from 'react';
import { CoverflowCarousel, CoverflowItem } from '@/components/ui/coverflow-carousel';
import { Product } from '@/types/product';

const MAX_ITEMS = 8;

function buildDiversifiedSelection(products: Product[]): Product[] {
  const available = products.filter((p) => !p.isSoldOut);
  const byScore = (a: Product, b: Product) => b.hypeMeter.score - a.hypeMeter.score;

  const categories = Array.from(new Set(available.map((p) => p.category)));
  const picked = new Map<string, Product>();

  // 1) La pieza con más Hype de cada categoría real presente en el catálogo.
  for (const cat of categories) {
    const top = available.filter((p) => p.category === cat).sort(byScore)[0];
    if (top) picked.set(top.id, top);
  }

  // 2) Rellena el resto con las siguientes de mayor Hype, sin repetir.
  for (const p of [...available].sort(byScore)) {
    if (picked.size >= MAX_ITEMS) break;
    if (!picked.has(p.id)) picked.set(p.id, p);
  }

  return Array.from(picked.values()).sort(byScore).slice(0, MAX_ITEMS);
}

interface DropsCoverflowProps {
  products: Product[];
}

export function DropsCoverflow({ products }: DropsCoverflowProps) {
  const items: CoverflowItem[] = buildDiversifiedSelection(products).map((p) => ({
    id: p.id,
    image: p.images[0] || '/placeholder-sneaker.svg',
    title: p.title,
    subtitle: `$${p.variants[0]?.price.toLocaleString() || '—'} MXN`,
    badge: `HEAT ${p.hypeMeter.score.toFixed(0)}`,
    href: `/product/${p.handle}`,
  }));

  if (items.length === 0) return null;

  return (
    <section className="py-14 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-2">
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">// CURADURÍA LAMK</span>
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight mt-1">DROPS PRINCIPALES</h2>
          <p className="text-[11px] text-zinc-500 mt-1">Lo más alto en Hype de cada categoría — no solo sneakers.</p>
        </div>
        <CoverflowCarousel items={items} />
      </div>
    </section>
  );
}
