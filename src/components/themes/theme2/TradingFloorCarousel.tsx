// src/components/themes/theme2/TradingFloorCarousel.tsx
//
// El carrusel "Hyped Kicks" en clave StockX: listados de borde fino en vez de
// tarjetas, la foto real del producto "quiebra" la línea superior del
// listado y levita con sombra suave al centrarse (pop elegante, no
// explosivo). Todas las cifras vienen de Product/hypeMeter reales — sin
// variación de precio inventada, ver nota en MarketTicker.tsx.

'use client';

import Image from 'next/image';
import React from 'react';
import { Product } from '@/types/product';
import { useCarouselActive } from '@/lib/useCarouselActive';
import { deriveSerial } from '@/lib/utils';

interface TradingFloorCarouselProps {
  products: Product[];
}

export function TradingFloorCarousel({ products }: TradingFloorCarouselProps) {
  const { containerRef, setItemRef, activeIndex } = useCarouselActive<HTMLDivElement>(products.length);
  if (products.length === 0) return null;

  return (
    <section id="trading-floor" className="bg-white dark:bg-[#111316] border-b border-black/10 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-2 flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-2xl sm:text-3xl" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif' }}>
          El piso de remate
        </h2>
        <span className="font-mono text-[11px] tracking-[0.06em] opacity-60 uppercase">{products.length} listados · catálogo en vivo</span>
      </div>

      <div
        ref={containerRef}
        className="flex gap-px overflow-x-auto pt-2 pb-10 bg-black/10 dark:bg-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
      >
        {products.map((p, i) => {
          const isActive = activeIndex === i;
          const price = p.variants[0]?.price;
          return (
            <article
              key={p.id}
              ref={setItemRef(i)}
              tabIndex={0}
              className="relative shrink-0 snap-start bg-white dark:bg-[#111316] pt-16 px-5 pb-5"
              style={{ width: 'min(70vw, 300px)' }}
            >
              <span className="absolute top-4 left-5 font-mono text-[11px] opacity-45">{deriveSerial(p)}</span>

              <div className="relative h-36 flex items-end justify-center">
                <span className="absolute top-[38%] left-0 right-0 h-px bg-black/15 dark:bg-white/20" aria-hidden />
                <div
                  className={`relative w-[88%] h-full transition-transform duration-[600ms] ${
                    isActive ? '-translate-y-[14%] scale-[1.02]' : 'translate-y-[6%] scale-90'
                  }`}
                  style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}
                >
                  <Image
                    src={p.images[0] || '/placeholder-sneaker.svg'}
                    alt={p.title}
                    fill
                    sizes="300px"
                    className={`object-contain transition-[filter] duration-500 ${
                      isActive ? 'drop-shadow-[0_16px_18px_rgba(0,0,0,0.22)]' : 'drop-shadow-[0_4px_5px_rgba(0,0,0,0.12)]'
                    }`}
                  />
                </div>
              </div>

              <a href={`/product/${p.handle}`} className="block mt-6 pt-4 border-t border-black/10 dark:border-white/10">
                <h3 className="text-sm font-semibold line-clamp-1">{p.title}</h3>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                  <Stat k="Última puja" v={price !== undefined ? `$${price.toLocaleString()}` : '—'} />
                  <Stat k="Vistas 24h" v={String(p.hypeMeter.viewsLast24h)} />
                </div>
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.05em] opacity-45">{k}</div>
      <div className="text-sm font-semibold font-mono tabular-nums mt-0.5">{v}</div>
    </div>
  );
}
