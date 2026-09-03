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
import { Product, ProductVariant } from '@/types/product';
import { useApp } from '@/context/AppContext';
import { DiscoveryTabs } from './DiscoveryTabs';
import { ProductCard } from './ProductCard';
import { DiscoveryTab, filterByDiscoveryTab } from '@/lib/discovery';
import { fadeUp } from '@/lib/motion';
import { PRODUCT_SECTIONS, sectionOf } from '@/lib/product-taxonomy';

// Las secciones del catálogo salen de lib/product-taxonomy.ts, NO de las
// cuatro categorías que devuelve Shopify.
//
// El motivo se ve con los números reales: Shopify mete 114 de las 265 piezas en
// "ACCESSORIES", y ahí dentro caben 74 gorras, 7 relojes, cartas de Pokémon,
// figuras de Bearbrick y hasta ropa mal archivada. Enseñar eso como una sola
// pastilla —"Bolsos y gorras · 114"— es esconder el catálogo detrás de una
// etiqueta que ni siquiera describe lo que hay. Con la taxonomía real salen
// siete secciones navegables, que es la variedad que la tienda de verdad tiene.
const PAGE_SIZE = 24;

interface CatalogGridProps {
  products: Product[];
}

export function CatalogGrid({ products }: CatalogGridProps) {
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('ALL');
  // 'TODAS' o la clave de una sección de PRODUCT_SECTIONS.
  const [category, setCategory] = useState<string>('TODAS');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { addItem } = useCart();
  const { t } = useApp();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Cuántas piezas hay REALMENTE en cada categoría, dentro de la pestaña de
  // descubrimiento activa. El número va en la pastilla: sin él, "ACCESORIOS" y
  // "JOYERÍA" se ven igual de importantes cuando una tiene 114 piezas y la otra
  // 6, y nadie sabe dónde vale la pena entrar.
  const countsByCategory = useMemo(() => {
    const base = filterByDiscoveryTab(products, discoveryTab);
    const counts = new Map<string, number>();
    for (const p of base) {
      const sec = sectionOf(p);
      if (sec) counts.set(sec.key, (counts.get(sec.key) ?? 0) + 1);
    }
    counts.set('TODAS', base.length);
    return counts;
  }, [products, discoveryTab]);

  const availableCategories: Array<{ key: string; label: string }> = [
    { key: 'TODAS', label: 'Todo' },
    ...PRODUCT_SECTIONS.filter((sec) => (countsByCategory.get(sec.key) ?? 0) > 0).map((sec) => ({
      key: sec.key,
      label: sec.label,
    })),
  ];

  const filtered = useMemo(() => {
    let result = filterByDiscoveryTab(products, discoveryTab);
    if (category !== 'TODAS') {
      const sec = PRODUCT_SECTIONS.find((x) => x.key === category);
      if (sec) result = result.filter((p) => sectionOf(p)?.key === sec.key);
    }
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

        </div>

        {/* Categoría como filtro PRINCIPAL (2026-09-03, pedido del cliente:
            "el catálogo debe ser de categorías, se hace mucho énfasis en tenis").
            Estaba escondida en un <select> en la esquina mientras las pestañas
            grandes eran de descubrimiento — así, la variedad real del catálogo
            no se veía por ningún lado. Los números no son decorativos: son el
            conteo real, y son la forma más rápida de que se note que Accesorios
            es la categoría más grande de la tienda, no Sneakers. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          {availableCategories.map((c) => {
            const activa = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                aria-pressed={activa}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                  activa
                    ? 'border-[#FF1E42] bg-[#FF1E42] text-white'
                    : 'border-border text-muted-foreground hover:border-zinc-500 hover:text-foreground'
                }`}
              >
                {c.label}
                <span className={`font-mono text-[9px] ${activa ? 'text-white/70' : 'opacity-60'}`}>
                  {countsByCategory.get(c.key) ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Descubrimiento, ahora como filtro secundario: cruza con la categoría
            elegida arriba. */}
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
