// src/components/home/DiscoverySection.tsx
//
// Versión compacta de las pestañas de descubrimiento para Home (el catálogo
// completo con scroll infinito vive en /catalog — ver CatalogGrid.tsx). Aquí
// se muestran hasta 8 piezas por pestaña, reusando ProductCard para que la
// tarjeta "Marketplace HUD" sea idéntica en todo el sitio.

'use client';

import React, { useState, useMemo } from 'react';
import { Product, ProductVariant } from '@/types/product';
import { useCart } from '@/hooks/useCart';
import { DiscoveryTabs } from '@/components/catalog/DiscoveryTabs';
import { ProductCard } from '@/components/catalog/ProductCard';
import { DiscoveryTab, filterByDiscoveryTab } from '@/lib/discovery';

interface DiscoverySectionProps {
  products: Product[];
}

const HOME_PREVIEW_LIMIT = 8;

// Fix (auditoría 2026-08-27, hallazgo #5): arrancaba en 'HOT' (Hype≥70),
// pero el propio DiscoveryTabs.tsx documenta que 'TODOS' es el default real
// del sistema ("para no esconder inventario real"). CatalogGrid.tsx ya
// arranca en 'ALL' — esto era la única inconsistencia. Confirmado en
// producción: 0 de 265 productos superan Hype≥70 hoy, así que la sección
// arrancaba vacía ("No hay piezas...") en el primer paint para cualquier
// visitante.
export function DiscoverySection({ products }: DiscoverySectionProps) {
  const [tab, setTab] = useState<DiscoveryTab>('ALL');
  const { addItem } = useCart();

  const items = useMemo(() => filterByDiscoveryTab(products, tab).slice(0, HOME_PREVIEW_LIMIT), [products, tab]);

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    addItem(product.title, product.id, product.images[0], variant);
  };

  if (products.length === 0) return null;

  return (
    <section className="py-14 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// DESCUBRE</span>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight mt-1">EXPLORA POR CATEGORÍA</h2>
          </div>
          <a href="/catalog" className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-[#FF1E42] transition">
            Ver catálogo completo →
          </a>
        </div>

        <DiscoveryTabs active={tab} onChange={setTab} />

        {items.length === 0 ? (
          <div className="p-10 border border-dashed border-border rounded-lg text-center text-zinc-500 text-xs">
            No hay piezas en esta categoría todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
