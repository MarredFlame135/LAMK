// src/app/(routes)/page.tsx

import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { DropsCoverflow } from '@/components/home/DropsCoverflow';
import { HypeCarousel } from '@/components/home/HypeCarousel';
import { SocialProofSection } from '@/components/home/SocialProofSection';
import { TenisinWidget } from '@/components/ai-concierge/TenisinWidget';
import { getCatalogLive } from '@/lib/catalog-source';

export default async function HomePage() {
  // Fuente única de verdad: catálogo real de Shopify, con fallback a mock si falla.
  const { products } = await getCatalogLive();

  return (
    <div className="bg-[#0A0A0C] text-[#F4F4F0] min-h-screen">
      <HeroSection />

      {/* Carrusel 3D de Drops principales */}
      <DropsCoverflow products={products} />

      {/* Carrusel LO MÁS HYPE */}
      <HypeCarousel products={products} />

      {/* Galería + Testimonios */}
      <SocialProofSection products={products} />

      {/* Widget Flotante Global de TENISIN */}
      <TenisinWidget />
    </div>
  );
}
