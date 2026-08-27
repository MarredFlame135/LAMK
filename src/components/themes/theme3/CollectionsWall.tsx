// src/components/themes/theme3/CollectionsWall.tsx
//
// Grid asimétrica de categorías reales del catálogo (no colecciones
// inventadas tipo "Dark Luxury" — el brief original las sugería como
// ejemplo, pero esto ya es la versión que se le entrega al cliente, así que
// solo agrupa por Product.category real y muestra el conteo real de piezas).

import React from 'react';
import Image from 'next/image';
import { Product } from '@/types/product';

interface CollectionsWallProps {
  products: Product[];
}

const CATEGORY_LABEL: Record<Product['category'], string> = {
  SNEAKERS: 'Sneakers',
  APPAREL: 'Ropa',
  ACCESSORIES: 'Accesorios',
  COLLECTIBLES: 'Coleccionables',
  JEWELRY: 'Joyería',
};

export function CollectionsWall({ products }: CollectionsWallProps) {
  const byCategory = new Map<Product['category'], Product[]>();
  for (const p of products) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }

  const cells = Array.from(byCategory.entries())
    .map(([category, items]) => ({
      category,
      count: items.length,
      cover: [...items].sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)[0],
    }))
    .sort((a, b) => b.count - a.count);

  if (cells.length === 0) return null;

  return (
    <section className="bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-4">
        <h2 className="font-black uppercase text-3xl sm:text-4xl tracking-tight" style={{ fontFamily: 'Arial Black, Helvetica Neue, Arial, sans-serif' }}>
          Curated Fits
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-[10rem] sm:auto-rows-[14rem] gap-[3px] bg-current border-y-[3px] border-current">
        {cells.map((cell, i) => (
          <a
            key={cell.category}
            href="/catalog"
            className={`relative bg-white dark:bg-black flex items-end overflow-hidden group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
          >
            {cell.cover && (
              <Image
                src={cell.cover.images[0] || '/placeholder-sneaker.svg'}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover opacity-90 mix-blend-luminosity group-hover:scale-105 transition-transform duration-500"
              />
            )}
            <div className="relative z-10 p-4 bg-black/70 dark:bg-white/15 backdrop-blur-[1px] w-full">
              <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-white/80">{cell.count} piezas</span>
              <span className="block font-black uppercase text-white text-xl sm:text-2xl" style={{ fontFamily: 'Arial Black, Helvetica Neue, Arial, sans-serif' }}>
                {CATEGORY_LABEL[cell.category]}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
