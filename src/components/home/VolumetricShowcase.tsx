// src/components/home/VolumetricShowcase.tsx
//
// Escaparate de galería: el par con más Hype sobre podio, la prenda con más
// Hype en el perchero, y el accesorio/coleccionable con más Hype en vitrina.
// Usa VolumetricStudio (ver src/components/ui/volumetric-studio.tsx) sobre el
// catálogo real — no hay assets 3D nuevos, el "3D" es el tilt + iluminación.

import React from 'react';
import { Product } from '@/types/product';
import { VolumetricStudio } from '@/components/ui/volumetric-studio';

interface VolumetricShowcaseProps {
  products: Product[];
}

function topByHype(products: Product[], categories: Product['category'][]): Product | undefined {
  return [...products]
    .filter((p) => categories.includes(p.category) && !p.isSoldOut)
    .sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)[0];
}

export function VolumetricShowcase({ products }: VolumetricShowcaseProps) {
  const featured = [
    { product: topByHype(products, ['SNEAKERS']), standType: 'podium' as const, label: 'EN PODIO' },
    { product: topByHype(products, ['APPAREL']), standType: 'rack' as const, label: 'EN PERCHERO' },
    { product: topByHype(products, ['ACCESSORIES', 'COLLECTIBLES', 'JEWELRY']), standType: 'vitrine' as const, label: 'EN VITRINA' },
  ].filter((f): f is { product: Product; standType: 'podium' | 'rack' | 'vitrine'; label: string } => Boolean(f.product));

  if (featured.length === 0) return null;

  return (
    <section className="py-14 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">// ESTUDIO LAMK</span>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-1">LO MÁS HYPE, EN EXHIBICIÓN</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {featured.map(({ product, standType, label }) => (
            <div key={product.id} className="space-y-2">
              <VolumetricStudio product={product} standType={standType} />
              <p className="text-center text-[10px] font-mono uppercase tracking-widest text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
