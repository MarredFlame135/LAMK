// src/components/themes/theme1/HypedKicksCarousel.tsx
//
// El carrusel "Hyped Kicks" obligatorio en las 3 versiones, aquí en clave
// cómic: cada producto vive en un panel con borde grueso y sombra sólida; la
// FOTO REAL del producto (Shopify) se posiciona más grande que el panel y
// "rompe" su borde superior. El pop se dispara con :hover Y con scroll real
// (useCarouselActive), para que funcione igual en móvil sin hover.

'use client';

import Image from 'next/image';
import React from 'react';
import { Product } from '@/types/product';
import { useCarouselActive } from '@/lib/useCarouselActive';

const SFX = ['POP!', 'BAM!', 'ZAP!', 'WHOOSH!', 'CRACK!', 'POW!'];

interface HypedKicksCarouselProps {
  products: Product[];
}

export function HypedKicksCarousel({ products }: HypedKicksCarouselProps) {
  const { containerRef, setItemRef, activeIndex } = useCarouselActive<HTMLDivElement>(products.length);
  if (products.length === 0) return null;

  return (
    <section id="hyped-kicks" className="bg-[#E4D5B8] border-y-4 border-[#17130F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-2 flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-display text-3xl sm:text-4xl font-black uppercase text-[#17130F]">Esta semana: el calor</h2>
        <span className="font-mono text-[11px] tracking-[0.08em] text-[#17130F]/70">{products.length} PARES · CATÁLOGO EN VIVO</span>
      </div>

      <div ref={containerRef} className="flex gap-11 overflow-x-auto pt-14 pb-16 px-[8vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {products.map((p, i) => {
          const isActive = activeIndex === i;
          const price = p.variants[0]?.price;
          return (
            <article
              key={p.id}
              ref={setItemRef(i)}
              tabIndex={0}
              className="relative shrink-0 snap-center bg-[#F6EFDD] border-[3.5px] border-[#17130F] pt-16 px-5 pb-5 shadow-[7px_7px_0_#17130F]"
              style={{ width: 'min(76vw, 320px)' }}
            >
              <span className="absolute -top-[3.5px] left-6 h-2 w-6 bg-[#17130F]" aria-hidden />

              <div className="relative h-36 flex items-end justify-center overflow-visible">
                <div
                  className={`relative w-[92%] h-full transition-transform duration-500 ${
                    isActive ? '-translate-y-[18%] scale-[1.14] rotate-[-2deg]' : 'translate-y-[4%] scale-90 rotate-[-6deg]'
                  }`}
                  style={{ transitionTimingFunction: 'cubic-bezier(.32,1.6,.5,1)' }}
                >
                  <Image
                    src={p.images[0] || '/placeholder-sneaker.svg'}
                    alt={p.title}
                    fill
                    sizes="320px"
                    className={`object-contain transition-[filter] duration-500 ${
                      isActive ? 'drop-shadow-[9px_11px_0_#17130F]' : 'drop-shadow-[4px_5px_0_#17130F]'
                    }`}
                  />
                </div>
                <div className={`absolute left-0 bottom-4 flex flex-col gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
                  <span className="h-[3px] w-7 bg-[#D42B1B]" />
                  <span className="h-[3px] w-5 bg-[#D42B1B]" />
                  <span className="h-[3px] w-3 bg-[#D42B1B]" />
                </div>
                <span
                  className={`absolute top-1 right-1 font-display text-sm rotate-[8deg] text-[#D42B1B] transition-all ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                  style={{ WebkitTextStroke: '1px #17130F' }}
                  aria-hidden
                >
                  {SFX[i % SFX.length]}
                </span>
              </div>

              <a href={`/product/${p.handle}`} className="block mt-6 pt-4 border-t-2 border-dashed border-[#17130F]/45">
                <h3 className="font-display text-base font-bold uppercase text-[#17130F] line-clamp-1">{p.title}</h3>
                <div className="mt-2 flex items-center justify-between">
                  {price !== undefined && (
                    <span className="font-mono font-bold text-[#17130F]">${price.toLocaleString()} MXN</span>
                  )}
                  <span className="font-mono text-[10px] bg-[#17130F] text-[#F6EFDD] px-1.5 py-0.5">
                    HEAT: {p.hypeMeter.sampleSize >= 50 ? p.hypeMeter.score.toFixed(0) : '—'}
                  </span>
                </div>
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
