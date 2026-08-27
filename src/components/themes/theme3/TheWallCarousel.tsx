// src/components/themes/theme3/TheWallCarousel.tsx
//
// El carrusel "Hyped Kicks" en clave Grailed: cada producto es un flyer
// pegado en la pared, con la foto real "despegándose" del panel al
// centrarse o al pasar el mouse. El stamp usa señales reales: DEADSTOCK
// (hypeMeter.label === 'ULTIMOS PARES'), AGOTADO (isSoldOut) o VERIFIED
// (piezas disponibles — la garantía de autenticidad es una promesa real de
// la marca, ver AuthenticitySeal, no un dato inventado por producto).

'use client';

import Image from 'next/image';
import React from 'react';
import { Product } from '@/types/product';
import { useCarouselActive } from '@/lib/useCarouselActive';

interface TheWallCarouselProps {
  products: Product[];
}

const TILTS = ['-3deg', '2.5deg', '-1.5deg', '3deg', '-2deg', '1.5deg'];

function stampFor(p: Product): { text: string; tone: 'orange' | 'black' } | null {
  if (p.isSoldOut) return { text: 'AGOTADO', tone: 'black' };
  if (p.hypeMeter.label === 'ULTIMOS PARES') return { text: 'DEADSTOCK', tone: 'orange' };
  return { text: 'VERIFIED', tone: 'orange' };
}

export function TheWallCarousel({ products }: TheWallCarouselProps) {
  const { containerRef, setItemRef, activeIndex } = useCarouselActive<HTMLDivElement>(products.length);
  if (products.length === 0) return null;

  return (
    <section id="the-wall" className="bg-white dark:bg-black text-black dark:text-white border-b-[3px] border-current">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-2 flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-black uppercase text-3xl sm:text-4xl tracking-tight" style={{ fontFamily: 'Arial Black, Helvetica Neue, Arial, sans-serif' }}>
          The Wall
        </h2>
        <span className="font-mono text-[11px] font-bold uppercase">{products.length} pares pegados hoy</span>
      </div>

      <div ref={containerRef} className="flex gap-14 overflow-x-auto pt-6 pb-16 px-[8vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {products.map((p, i) => {
          const isActive = activeIndex === i;
          const price = p.variants[0]?.price;
          const stamp = stampFor(p);
          const tilt = TILTS[i % TILTS.length];
          return (
            <article
              key={p.id}
              ref={setItemRef(i)}
              tabIndex={0}
              className="relative shrink-0 snap-center bg-white dark:bg-black border-[3px] border-current pt-16 px-4 pb-4 transition-transform"
              style={{
                width: 'min(74vw, 300px)',
                transform: isActive ? 'rotate(0deg) translateY(-6px)' : `rotate(${tilt})`,
                boxShadow: isActive ? '12px 14px 0 currentColor' : '8px 8px 0 rgba(128,128,128,0.6)',
                transitionDuration: '450ms',
                transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)',
              }}
            >
              <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 h-2.5 w-7 bg-current" aria-hidden />
              {stamp && (
                <span
                  className={`absolute top-2.5 right-2.5 font-mono text-[10px] font-bold uppercase border-2 px-1.5 py-0.5 rotate-[6deg] ${
                    stamp.tone === 'orange' ? 'border-[#FF4200] text-[#FF4200]' : 'border-current text-current opacity-60'
                  }`}
                >
                  {stamp.text}
                </span>
              )}

              <div className="relative h-38 flex items-end justify-center" style={{ height: '9.5rem' }}>
                <div
                  className={`relative w-full h-full transition-transform duration-500 ${
                    isActive ? 'scale-[1.18] -translate-y-[16%] -rotate-3' : 'scale-90 translate-y-[6%]'
                  }`}
                >
                  <Image
                    src={p.images[0] || '/placeholder-sneaker.svg'}
                    alt={p.title}
                    fill
                    sizes="300px"
                    className={`object-contain transition-[filter] duration-500 ${
                      isActive ? 'drop-shadow-[10px_11px_0_currentColor]' : 'drop-shadow-[6px_7px_0_rgba(128,128,128,0.7)]'
                    }`}
                  />
                </div>
              </div>

              <a href={`/product/${p.handle}`} className="block mt-6 pt-3.5 border-t-2 border-current">
                <h3 className="font-black uppercase text-base tracking-tight line-clamp-1" style={{ fontFamily: 'Arial Black, Helvetica Neue, Arial, sans-serif' }}>
                  {p.title}
                </h3>
                <div className="mt-2 flex items-center justify-between font-mono text-sm font-bold">
                  <span>{price !== undefined ? `$${price.toLocaleString()}` : '—'}</span>
                  <span className="opacity-60 text-[11px]">{p.brand}</span>
                </div>
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
