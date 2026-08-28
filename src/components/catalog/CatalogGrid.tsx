// src/components/catalog/CatalogGrid.tsx
//
// Parte cliente del catálogo (filtros interactivos + micro-interacciones).
// Recibe TODOS los productos ya resueltos (Shopify real o mock, sin límite
// artificial — ver shopify/index.ts::getProducts) desde el Server Component
// en src/app/(routes)/catalog/page.tsx, y los renderiza progresivamente con
// scroll infinito para no bloquear el hilo principal pintando cientos de
// tarjetas de una sola vez.

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { Product, ProductVariant } from '@/types/product';
import { useApp } from '@/context/AppContext';
import { DiscoveryTabs } from './DiscoveryTabs';
import { ProductCard } from './ProductCard';
import { DiscoveryTab, filterByDiscoveryTab } from '@/lib/discovery';
import { fadeUp } from '@/lib/motion';

const CATEGORIES: Array<'TODAS' | Product['category']> = ['TODAS', 'SNEAKERS', 'APPAREL', 'ACCESSORIES', 'COLLECTIBLES', 'JEWELRY'];
const PAGE_SIZE = 24;

interface CatalogGridProps {
  products: Product[];
}

export function CatalogGrid({ products }: CatalogGridProps) {
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('ALL');
  const [category, setCategory] = useState<'TODAS' | Product['category']>('TODAS');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { addItem } = useCart();
  const { t } = useApp();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const availableCategories = CATEGORIES.filter((c) => c === 'TODAS' || products.some((p) => p.category === c));

  const filtered = useMemo(() => {
    let result = filterByDiscoveryTab(products, discoveryTab);
    if (category !== 'TODAS') result = result.filter((p) => p.category === category);
    return result;
  }, [products, discoveryTab, category]);

  // Reinicia la paginación cuando cambian los filtros — evita mostrar 0
  // tarjetas si el usuario ya había scrolleado más allá del nuevo total.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [discoveryTab, category]);

  // Scroll infinito: un sentinel al fondo del grid dispara la siguiente
  // página cuando entra en viewport — sin librería extra, IntersectionObserver nativo.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    addItem(product.title, product.id, product.images[0], variant);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-background text-foreground min-h-screen space-y-6">

      {/* Header Catálogo */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="border-b border-border pb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-mono text-[#FF1E42] uppercase">{t.catalogPage.eyebrow}</span>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">{t.catalogPage.title}</h1>
            <p className="text-[11px] font-mono text-zinc-400 mt-1">
              {filtered.length} pieza{filtered.length !== 1 ? 's' : ''} en inventario
            </p>
          </div>

          {/* Filtro secundario por categoría — compacto, las pestañas de descubrimiento son el filtro principal */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="bg-muted border border-border rounded-lg px-3 py-2 text-xs font-mono uppercase text-foreground"
          >
            {availableCategories.map((c) => (
              <option key={c} value={c}>{c === 'TODAS' ? 'TODAS LAS CATEGORÍAS' : CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        {/* Pestañas de descubrimiento */}
        <DiscoveryTabs active={discoveryTab} onChange={setDiscoveryTab} />
      </motion.div>

      {filtered.length === 0 ? (
        <div className="p-16 border border-dashed border-border rounded-lg text-center text-zinc-400 text-sm">
          {t.catalogPage.empty}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} onAddToCart={handleAddToCart} />
            ))}
          </div>

          {/* Sentinel de scroll infinito + fallback de botón para quien prefiera clic explícito */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length))}
                className="px-6 py-2.5 bg-muted hover:bg-border text-xs font-bold font-mono uppercase rounded-lg text-foreground transition"
              >
                Cargar más ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
