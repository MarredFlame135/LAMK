// src/app/(routes)/page.tsx
//
// Ronda 2026-08-27 (parte 2): el cliente probó las 3 propuestas de pitch
// (Ink & Static / After Hours Market / The Wall) y eligió quedarse con el
// sistema de diseño base del sitio (el mismo de /catalog y /product) en vez
// de cualquiera de las 3 — así que Home vuelve a ser una sola experiencia
// consistente con el resto del sitio, no un selector.
//
// El código de las 3 propuestas NO se borró (sigue en
// src/components/themes/) por si se quieren retomar más adelante; solo
// dejaron de ser lo que se renderiza aquí. Ver ThemeVariantContext.tsx.

import React from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import { HypeMarquee } from '@/components/home/HypeMarquee';
import { VolumetricShowcase } from '@/components/home/VolumetricShowcase';
import { DropsCoverflow } from '@/components/home/DropsCoverflow';
import { HypeCarousel } from '@/components/home/HypeCarousel';
import { DiscoverySection } from '@/components/home/DiscoverySection';
import { SocialProofSection } from '@/components/home/SocialProofSection';
import { Lookbook } from '@/components/home/Lookbook';
import { IGLiveMonitor } from '@/components/home/IGLiveMonitor';
import { ScrollMacroBackground } from '@/components/home/ScrollMacroBackground';
import { TenisinWidgetLoader } from '@/components/ai-concierge/TenisinWidgetLoader';
import { getCatalogLive } from '@/lib/catalog-source';

// Fix (hallazgo #3 de la auditoría de Fase 3): sin esto, Next trata la
// página como 100% estática (generada solo en build) — el stock real y el
// Hype Meter quedaban congelados hasta el siguiente deploy. Mismo patrón
// que ya usa api/catalog/route.ts (revalidate = 60): sigue sirviéndose
// desde caché/CDN la mayor parte del tiempo (ISR), solo se refresca cada
// 60s en vez de solo en cada deploy.
export const revalidate = 60;

export default async function HomePage() {
  // Fuente única de verdad: catálogo real de Shopify, con fallback a mock si falla.
  const { products } = await getCatalogLive();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <HeroSection />
      <HypeMarquee />
      <VolumetricShowcase products={products} />
      <DropsCoverflow products={products} />
      <HypeCarousel products={products} />

      {/* Tarea 3: fondo macro atado al scroll, envolviendo el Lookbook */}
      <ScrollMacroBackground>
        <Lookbook />
      </ScrollMacroBackground>

      <IGLiveMonitor products={products} />
      <DiscoverySection products={products} />
      <SocialProofSection products={products} />

      {/* Widget Flotante Global de TENISIN */}
      <TenisinWidgetLoader />
    </div>
  );
}
