// src/components/catalog/CatalogGrid.tsx
//
// Parte cliente del catálogo (filtros interactivos + micro-interacciones).
// Recibe TODOS los productos ya resueltos (Shopify real o mock, sin límite
// artificial — ver shopify/index.ts::getProducts) desde el Server Component
// en src/app/(routes)/catalog/page.tsx, y los renderiza progresivamente con
// scroll infinito para no bloquear el hilo principal pintando cientos de
// tarjetas de una sola vez.
//
// --- Los cuatro filtros (rediseño 2026-09-03, pedido del cliente) ---
//
// El cliente pidió el catálogo "como la página anterior": secciones, marcas y
// un filtro de precio. Los cuatro ejes cruzan entre sí:
//
//   CATEGORÍA  lib/product-taxonomy.ts  — Sneakers, Ropa, Gorras…
//   MARCA      lib/product-brand.ts     — Jordan, Bape, 31 Hats…
//   PRECIO     lib/discovery.ts         — cuatro tramos de la distribución real
//   COLECCIÓN  lib/discovery.ts         — MOST HYPE / MOST DROPPED / GRAILS…
//
// Las secciones NO son las cuatro categorías que devuelve Shopify: ahí 114 de
// las 265 piezas caen en "ACCESSORIES", y dentro hay 74 gorras, relojes,
// cartas de Pokémon y hasta ropa mal archivada. Ver product-taxonomy.ts.
//
// --- Los conteos son facetados, y eso NO es adorno ---
//
// El número de cada pastilla se calcula contra el catálogo ya filtrado por los
// OTROS tres ejes, no contra el catálogo entero. Si no, estando en "Gorras" la
// pastilla "Jordan" diría 27 y al pulsarla daría 0 resultados: cada pastilla
// sería una posible vía muerta. Así, un 0 nunca se ofrece — las opciones sin
// piezas ni se pintan.

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '@/hooks/useCart';
import { Product, ProductVariant } from '@/types/product';
import { useApp } from '@/context/AppContext';
import { DiscoveryTabs } from './DiscoveryTabs';
import { ProductCard } from './ProductCard';
import { DiscoveryTab, matchesDiscoveryTab, PRICE_BANDS, PriceBandId, matchesPriceBand } from '@/lib/discovery';
import { fadeUp } from '@/lib/motion';
import { PRODUCT_SECTIONS, sectionOf } from '@/lib/product-taxonomy';
import { brandOf } from '@/lib/product-brand';

const PAGE_SIZE = 24;

// Cuántas marcas se ven antes de "Ver todas". El catálogo real tiene 54, y
// pintarlas todas de entrada entierra el resto de la página bajo un muro de
// pastillas. Las 14 primeras (ordenadas por conteo) ya cubren la mayoría del
// inventario; el resto queda a un clic.
const BRANDS_VISIBLE = 14;

interface CatalogGridProps {
  products: Product[];
}

interface Filters {
  tab: DiscoveryTab;
  category: string;   // 'TODAS' o clave de PRODUCT_SECTIONS
  brand: string;      // 'TODAS' o nombre de marca
  band: PriceBandId;  // 'ALL' o id de PRICE_BANDS
}

const NO_FILTERS: Filters = { tab: 'ALL', category: 'TODAS', brand: 'TODAS', band: 'ALL' };

type AxisKey = 'tab' | 'category' | 'brand' | 'band';

// Un predicado por eje. `index` es la posición en el catálogo COMPLETO: la
// pestaña MOST DROPPED la usa como respaldo cuando el producto no trae
// `publishedAt` real (ver discovery.ts). Antes se pasaba la posición dentro
// del arreglo YA filtrado, así que "recién llegado" cambiaba de significado
// según qué otro filtro estuviera puesto.
const AXES: Record<AxisKey, (p: Product, i: number, f: Filters) => boolean> = {
  tab: (p, i, f) => matchesDiscoveryTab(p, f.tab, i),
  category: (p, _i, f) => f.category === 'TODAS' || sectionOf(p)?.key === f.category,
  brand: (p, _i, f) => f.brand === 'TODAS' || brandOf(p) === f.brand,
  band: (p, _i, f) => matchesPriceBand(p, f.band),
};

const AXIS_KEYS = Object.keys(AXES) as AxisKey[];

export function CatalogGrid({ products }: CatalogGridProps) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { addItem } = useCart();
  const { t } = useApp();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  // El catálogo filtrado por todos los ejes MENOS el que se pasa — la base
  // sobre la que se cuenta ese eje. Con `except` en null es el resultado final.
  const subsetExcept = useMemo(() => {
    const cache = new Map<string, Product[]>();
    return (except: AxisKey | null): Product[] => {
      const key = except ?? '*';
      const hit = cache.get(key);
      if (hit) return hit;
      const out = products.filter((p, i) => AXIS_KEYS.every((k) => k === except || AXES[k](p, i, filters)));
      cache.set(key, out);
      return out;
    };
  }, [products, filters]);

  const filtered = useMemo(() => subsetExcept(null), [subsetExcept]);

  const categoryOptions = useMemo(() => {
    const base = subsetExcept('category');
    const counts = new Map<string, number>();
    for (const p of base) {
      const sec = sectionOf(p);
      if (sec) counts.set(sec.key, (counts.get(sec.key) ?? 0) + 1);
    }
    return [
      { key: 'TODAS', label: 'Todo', count: base.length },
      // El eje seleccionado se mantiene visible aunque su conteo caiga a 0
      // (pasa cuando el cruce con otro filtro se queda sin piezas): si la
      // pastilla activa desaparece, la persona ve un catálogo vacío sin
      // ninguna pista de cuál de sus filtros lo dejó así.
      ...PRODUCT_SECTIONS.filter((s) => (counts.get(s.key) ?? 0) > 0 || s.key === filters.category).map((s) => ({
        key: s.key,
        label: s.label,
        count: counts.get(s.key) ?? 0,
      })),
    ];
  }, [subsetExcept, filters.category]);

  const brandOptions = useMemo(() => {
    const base = subsetExcept('brand');
    const counts = new Map<string, number>();
    for (const p of base) {
      const b = brandOf(p);
      if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [subsetExcept]);

  const bandOptions = useMemo(() => {
    const base = subsetExcept('band');
    return PRICE_BANDS.map((b) => ({
      id: b.id,
      key: b.id,
      label: b.label,
      count: base.filter((p) => matchesPriceBand(p, b.id)).length,
    })).filter((b) => b.count > 0 || b.id === filters.band);
  }, [subsetExcept, filters.band]);

  // Reinicia la paginación cuando cambian los filtros — evita mostrar 0
  // tarjetas si el usuario ya había scrolleado más allá del nuevo total.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

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
  const anyFilter =
    filters.tab !== 'ALL' || filters.category !== 'TODAS' || filters.brand !== 'TODAS' || filters.band !== 'ALL';

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    addItem(product.title, product.id, product.images[0], variant);
  };

  // La marca activa siempre se ve, aunque esté fuera de las 14 primeras: si
  // no, elegir una marca de la cola y luego colapsar la lista dejaría un
  // filtro puesto sin ninguna pastilla encendida que lo delate.
  const visibleBrands = showAllBrands
    ? brandOptions
    : (() => {
        const top = brandOptions.slice(0, BRANDS_VISIBLE);
        const sel = brandOptions.find((b) => b.key === filters.brand);
        return sel && !top.includes(sel) ? [...top, sel] : top;
      })();
  const brandTotal = brandOptions.reduce((acc, b) => acc + b.count, 0);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-background text-foreground min-h-screen space-y-6">

      {/* Header Catálogo */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="border-b border-border pb-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="text-xs font-mono text-[#FF1E42] uppercase">{t.catalogPage.eyebrow}</span>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">{t.catalogPage.title}</h1>
            <p className="text-[11px] font-mono text-zinc-400 mt-1">
              {filtered.length} pieza{filtered.length !== 1 ? 's' : ''} en inventario
            </p>
          </div>
          {anyFilter && (
            <button
              type="button"
              onClick={() => { setFilters(NO_FILTERS); setShowAllBrands(false); }}
              className="rounded-full border border-border px-3.5 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wide text-zinc-400 transition hover:border-[#FF1E42] hover:text-foreground"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <FilterRow label="Categoría" hint="Sección de la tienda">
          {categoryOptions.map((c) => (
            <Pill key={c.key} active={filters.category === c.key} count={c.count} onClick={() => set('category', c.key)}>
              {c.label}
            </Pill>
          ))}
        </FilterRow>

        {/* Marca — el menú que tenía la tienda anterior (Jordan, Nike, Yeezy,
            Bape, Supreme…). Las 13 piezas cuyo título no nombra ninguna marca
            conocida no aparecen bajo ninguna pastilla, y eso es correcto: no
            se les inventa una. Ver lib/product-brand.ts. */}
        {brandOptions.length > 0 && (
          <FilterRow label="Marca" hint={`${brandOptions.length} con piezas`}>
            <Pill active={filters.brand === 'TODAS'} count={brandTotal} onClick={() => set('brand', 'TODAS')}>
              Todas
            </Pill>
            {visibleBrands.map((b) => (
              <Pill key={b.key} active={filters.brand === b.key} count={b.count} onClick={() => set('brand', b.key)}>
                {b.key}
              </Pill>
            ))}
            {brandOptions.length > BRANDS_VISIBLE && (
              <button
                type="button"
                onClick={() => setShowAllBrands((v) => !v)}
                className="rounded-full border border-dashed border-border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400 transition hover:border-[#FF1E42] hover:text-foreground"
              >
                {showAllBrands ? 'Ver menos' : `Ver todas (${brandOptions.length})`}
              </button>
            )}
          </FilterRow>
        )}

        <FilterRow label="Precio" hint="MXN">
          <Pill active={filters.band === 'ALL'} count={subsetExcept('band').length} onClick={() => set('band', 'ALL')}>
            Cualquiera
          </Pill>
          {bandOptions.map((b) => (
            <Pill key={b.key} active={filters.band === b.key} count={b.count} onClick={() => set('band', b.key)}>
              {b.label}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="Colección" hint="Cruza con todo lo de arriba">
          <DiscoveryTabs active={filters.tab} onChange={(tab) => set('tab', tab)} />
        </FilterRow>
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

// Un eje de filtro con su etiqueta. Con cuatro filas de pastillas seguidas y
// sin nombre, nadie sabe qué está eligiendo en cada una.
function FilterRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        {hint && <span className="font-mono text-[9px] uppercase tracking-wide text-zinc-500">// {hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`Filtrar por ${label.toLowerCase()}`}>
        {children}
      </div>
    </div>
  );
}

function Pill({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
        active
          ? 'border-[#FF1E42] bg-[#FF1E42] text-white'
          : 'border-border text-muted-foreground hover:border-zinc-500 hover:text-foreground'
      }`}
    >
      {children}
      <span className={`font-mono text-[9px] ${active ? 'text-white/70' : 'opacity-60'}`}>{count}</span>
    </button>
  );
}
