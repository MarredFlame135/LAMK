// src/components/home/SocialProofSection.tsx
//
// Galería "Momentos LAMK" con fotos reales del catálogo + reseñas 100% reales
// de clientes con compra verificada (reviews-store.ts). Ya NO se rellena con
// testimonios ficticios — el cliente pidió quitar el EXAMPLE_TESTIMONIALS que
// se mezclaba con las reseñas reales; si aún no hay reseñas reales, la
// sección simplemente no se muestra en vez de simular actividad que no existe.
//
// El feed en vivo de Instagram (@look_atmy_kicks) requiere credenciales de
// Meta Graph API que este proyecto no tiene configuradas todavía (ver
// META_APP_ID/META_APP_SECRET en .env.example) — mientras tanto se muestra
// un CTA honesto al perfil real en vez de fingir un feed sincronizado.

import React from 'react';
import { ExpandableGallery, GalleryItem } from '@/components/ui/gallery-animation';
import { TestimonialCard, TestimonialData } from '@/components/ui/testimonial';
import { Product } from '@/types/product';
import { getReviews } from '@/lib/reviews-store';

const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/look_atmy_kicks/';

interface SocialProofSectionProps {
  products: Product[];
}

export async function SocialProofSection({ products }: SocialProofSectionProps) {
  const galleryItems: GalleryItem[] = products.slice(0, 8).map((p) => ({
    id: p.id,
    image: p.images[0] || '/placeholder-sneaker.svg',
    caption: p.title,
    href: `/product/${p.handle}`,
  }));

  // Solo reseñas reales de clientes con compra verificada — sin relleno ficticio.
  const testimonials: TestimonialData[] = (await getReviews()).map((r) => ({
    id: r.id,
    name: r.customerName,
    quote: r.text,
    rating: r.rating,
    photoUrl: r.photoUrl,
    verifiedPurchase: true,
  }));

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 space-y-16">

        {/* Galería + CTA honesto a Instagram real (sin API de Meta conectada aún) */}
        {galleryItems.length > 0 && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <div>
                <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// MOMENTOS LAMK</span>
                <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-1">GALERÍA DE DROPS</h2>
              </div>
              <a
                href={INSTAGRAM_PROFILE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-mono text-zinc-400 hover:text-[#FF1E42] uppercase tracking-widest transition"
              >
                Síguenos en Instagram ↗
              </a>
            </div>
            <ExpandableGallery items={galleryItems} />
          </div>
        )}

        {/* Testimonios: solo se muestra si hay reseñas reales de verdad */}
        {testimonials.length > 0 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">// SOCIAL PROOF</span>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-1">LO QUE DICEN NUESTROS COLECCIONISTAS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <TestimonialCard key={t.id} data={t} />
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
