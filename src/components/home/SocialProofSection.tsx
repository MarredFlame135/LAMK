// src/components/home/SocialProofSection.tsx
//
// Galería "Momentos LAMK" con fotos reales del catálogo (NO son posts de
// Instagram reales todavía — no hay credenciales de Meta Graph API
// configuradas; queda listo para conectarse en cuanto existan) + testimonios
// de ejemplo claramente marcados como tal (ver testimonial.tsx: isExample).

import React from 'react';
import { ExpandableGallery, GalleryItem } from '@/components/ui/gallery-animation';
import { TestimonialCard, TestimonialData } from '@/components/ui/testimonial';
import { Product } from '@/types/product';

const EXAMPLE_TESTIMONIALS: TestimonialData[] = [
  {
    id: 't1',
    name: 'Carlos Mendoza',
    handle: '@carlitos_kicks',
    quote: 'Pedí unos Jordan agotados en toda la ciudad y TENISIN me avisó apenas hubo restock. Llegaron en 2 días.',
    rating: 5,
    isExample: true,
  },
  {
    id: 't2',
    name: 'Valentina Ruiz',
    handle: '@hype_valentina',
    quote: 'La Bóveda del Coleccionista es adictiva — ya voy por el rango Legend y las tarjetas cromadas se ven increíbles.',
    rating: 5,
    isExample: true,
  },
  {
    id: 't3',
    name: 'Dante Medina',
    handle: '@dante.mx',
    quote: 'El Fit Advisor me salvó de pedir mal la talla en un par importado. 100% recomendado.',
    rating: 5,
    isExample: true,
  },
];

interface SocialProofSectionProps {
  products: Product[];
}

export function SocialProofSection({ products }: SocialProofSectionProps) {
  const galleryItems: GalleryItem[] = products.slice(0, 8).map((p) => ({
    id: p.id,
    image: p.images[0] || '/placeholder-sneaker.svg',
    caption: p.title,
    href: `/product/${p.handle}`,
  }));

  return (
    <section className="py-16 bg-[#0A0A0C]">
      <div className="max-w-7xl mx-auto px-4 space-y-16">

        {/* Galería / futuro feed de Instagram */}
        {galleryItems.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-xs font-mono text-[#E60026] uppercase tracking-widest">// MOMENTOS LAMK</span>
                <h2 className="text-2xl font-black uppercase tracking-tight mt-1">GALERÍA DE DROPS</h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 uppercase hidden sm:block">Próximamente sincronizado con Instagram</span>
            </div>
            <ExpandableGallery items={galleryItems} />
          </div>
        )}

        {/* Testimonios */}
        <div>
          <div className="text-center mb-6">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">// SOCIAL PROOF</span>
            <h2 className="text-2xl font-black uppercase tracking-tight mt-1">LO QUE DICEN NUESTROS COLECCIONISTAS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EXAMPLE_TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.id} data={t} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
