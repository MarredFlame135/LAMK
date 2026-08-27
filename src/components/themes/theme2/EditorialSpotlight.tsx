// src/components/themes/theme2/EditorialSpotlight.tsx
//
// Contrapunto en calma frente al piso de remate denso (nota A Ma Manière del
// brief). Usa el storytelling REAL del producto con más demanda del momento
// (Product.storytelling, ya viene de Shopify/metafields) — no hay copy
// editorial inventado aquí.

import React from 'react';
import Image from 'next/image';
import { Product } from '@/types/product';

interface EditorialSpotlightProps {
  product?: Product;
}

export function EditorialSpotlight({ product }: EditorialSpotlightProps) {
  if (!product) return null;
  const { storytelling } = product;

  return (
    <section className="bg-[#F7F5F0] dark:bg-[#0B0C0E] text-[#0C0C0D] dark:text-[#F2F0EA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-[4/5] border border-black/15 dark:border-white/15 bg-white dark:bg-[#111316]">
          <Image
            src={product.images[0] || '/placeholder-sneaker.svg'}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-8"
          />
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-60 mb-3">Editorial</p>
          <h2 className="text-3xl sm:text-4xl leading-tight max-w-sm" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif' }}>
            {product.title}
          </h2>
          <p className="mt-5 max-w-md text-sm sm:text-base opacity-75 leading-relaxed">{storytelling.storySummary}</p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.05em] opacity-60">
            <div><dt className="inline">Colorway </dt><dd className="inline font-semibold">{storytelling.colorway}</dd></div>
            {storytelling.collaboration && (
              <div><dt className="inline">Colaboración </dt><dd className="inline font-semibold">{storytelling.collaboration}</dd></div>
            )}
            {storytelling.releaseYear && (
              <div><dt className="inline">Año </dt><dd className="inline font-semibold">{storytelling.releaseYear}</dd></div>
            )}
          </dl>
          <a href={`/product/${product.handle}`} className="inline-block mt-7 font-mono text-xs uppercase tracking-[0.06em] border-b border-current pb-0.5">
            Ver la pieza →
          </a>
        </div>
      </div>
    </section>
  );
}
