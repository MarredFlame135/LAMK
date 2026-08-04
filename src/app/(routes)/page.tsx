// src/app/(routes)/page.tsx

import React from 'react';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { HypeCarousel } from '@/components/home/HypeCarousel';
import { TenisinWidget } from '@/components/ai-concierge/TenisinWidget';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { Product } from '@/types/product';

// Productos de prueba basados en tu catálogo CSV
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    handle: 'hoodie-bape-seoul-exclusive-camo-shark',
    title: 'HOODIE BAPE SEOUL EXCLUSIVE CAMO SHARK',
    brand: 'BAPE',
    category: 'APPAREL',
    description: 'Edición especial Seoul Exclusive importada.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/26_205bc3c0-8181-49ae-8b46-b5ac52fd656e.png?v=1781933042'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'HALF_SIZE_UP', recommendationNote: 'Recomendamos pedir 0.5 o 1 talla arriba (Corte Japonés).' },
    storytelling: { storySummary: 'Lanzamiento limitado exclusivo de la tienda BAPE Seúl.', colorway: 'Seoul Camo' },
    hypeMeter: { score: 98, viewsLast24h: 340, stockRemaining: 2, label: 'ULTIMOS PARES' },
    variants: [
      { id: 'v1', sku: 'BAPE-M', price: 15500, stock: 2, isAvailable: true, size: { mx: 27, usMen: 9, usWomen: 10.5, eu: 42.5, cm: 27 } }
    ],
  },
  {
    id: 'prod-2',
    handle: 'tenis-adidas-x-pharrell-williams',
    title: 'TENIS ADIDAS x PHARRELL WILLIAMS',
    brand: 'ADIDAS',
    category: 'SNEAKERS',
    description: 'Colaboración icónica de edición limitada.',
    images: ['https://cdn.shopify.com/s/files/1/0776/8984/8114/files/DUNK_LOW_REVERSE_UNC_45cd9714-c500-421f-8962-d12c5a09b48e.png?v=1785819967'],
    isSoldOut: false,
    fitAdvisor: { fitType: 'TRUE_TO_SIZE', recommendationNote: 'Viene exactamente a la talla.' },
    storytelling: { storySummary: 'Diseño exclusivo enfocado en la cultura streetwear.', colorway: 'Multi' },
    hypeMeter: { score: 88, viewsLast24h: 190, stockRemaining: 4, label: 'ALTA DEMANDA' },
    variants: [
      { id: 'v2', sku: 'ADI-PHAR-27', price: 10000, stock: 4, isAvailable: true, size: { mx: 27, usMen: 9, usWomen: 10.5, eu: 42.5, cm: 27 } }
    ],
  },
];

export default function HomePage() {
  return (
    <div className="bg-[#0A0A0C] text-[#F4F4F0] min-h-screen">
      
      {/* Hero Banner Principal */}
      <section className="relative py-20 px-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-red-950/60 border border-red-600/40 rounded-full text-[10px] font-mono text-red-500 font-bold uppercase">
              🔥 PLATAFORMA PWA NEXT-GEN
            </span>
            <ThemeAndLangSwitcher />
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight leading-none">
            NO VENDES TENIS. <br />
            <span className="text-[#E60026]">CONSTRUYES UN CLUB</span> <br />
            DE COLECCIONISTAS.
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-xl leading-relaxed">
            Bienvenido a {SAAS_CONFIG.brandName}. Cada compra acumula puntos XP, desbloquea rangos VIP en la Bóveda del Coleccionista y te da acceso a Drops exclusivos antes que a nadie.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="/admin/offline-sales"
              className="px-8 py-4 bg-[#E60026] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-xl shadow-red-900/30"
            >
              PANEL ADMIN POS & DEUDAS →
            </a>
          </div>
        </div>

        {/* Tarjeta Visual de TENISIN */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#121215] to-black border border-zinc-800 p-8 rounded-3xl relative overflow-hidden text-center space-y-4 shadow-2xl">
          <div className="w-32 h-32 mx-auto relative animate-float tenisin-glow">
            <img
              src={SAAS_CONFIG.mascotPoses.idle}
              alt={SAAS_CONFIG.mascotName}
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <span className="text-xs font-mono text-amber-400 uppercase font-bold">
              CONOCE A {SAAS_CONFIG.mascotName} 👟
            </span>
            <h3 className="text-lg font-black uppercase mt-1">TU ASISTENTE IA DE CAZA DE KICKS</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              "{SAAS_CONFIG.mascotGreeting}"
            </p>
          </div>
        </div>

      </section>

      {/* Carrusel LO MÁS HYPE */}
      <HypeCarousel products={MOCK_PRODUCTS} />

      {/* Widget Flotante Global de TENISIN */}
      <TenisinWidget />

    </div>
  );
}