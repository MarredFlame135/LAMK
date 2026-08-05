// src/app/(routes)/page.tsx

import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { HypeCarousel } from '@/components/home/HypeCarousel';
import { TenisinWidget } from '@/components/ai-concierge/TenisinWidget';
import { getCatalog } from '@/lib/catalog';

export default function HomePage() {
  // Fuente única de verdad: mismo catálogo que /catalog, /product/[handle] y Tenisin
  const products = getCatalog();

  return (
    <div className="bg-[#0A0A0C] text-[#F4F4F0] min-h-screen">
      <HeroSection />

      {/* Carrusel LO MÁS HYPE */}
      <HypeCarousel products={products} />

      {/* Widget Flotante Global de TENISIN */}
      <TenisinWidget />
    </div>
  );
}
