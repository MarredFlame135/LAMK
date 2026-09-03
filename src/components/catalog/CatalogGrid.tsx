// src/components/catalog/CatalogGrid.tsx
//
// Parte cliente del catálogo (filtros interactivos + micro-interacciones).
// Recibe TODOS los productos ya resueltos (Shopify real o mock, sin límite
// artificial — ver shopify/index.ts::getProducts) desde el Server Component
// en src/app/(routes)/catalog/page.tsx, y los renderiza progresivamente con
// scroll infinito para no bloquear el hilo principal pintando cientos de
// tarjetas de una sola vez.
//
// --- Los filtros son un ÁRBOL, no cuatro filas (2026-09-03, ronda 3) ---
//
// La versión anterior ponía todo plano y a la vista: siete categorías, 54
// marcas, cuatro tramos de precio y seis colecciones, cuatro filas de
// pastillas seguidas. El cliente lo cortó en seco — "no quiero tantas
// categorías, que se muestren las principales y que de ahí se desplieguen
// jerárquicamente" — y tenía razón: un filtro que exige leer setenta opciones
// antes de elegir la primera no es un filtro, es un índice.
//
// Ahora son cuatro puertas (Sneakers · Ropa · Accesorios · Coleccionables,
// las mismas que tenía la tienda anterior) y todo lo demás vive DENTRO de la
// puerta a la que pertenece: las subsecciones y las marcas de esa rama. El
// árbol y sus conteos viven en lib/product-taxonomy.ts.
//
// **Las marcas se movieron dentro de cada rama a propósito**, y no es solo
// ahorro de espacio: es como funcionaba la tienda anterior
// (/collections/jordan-sneakers, /collections/hoodies-bape). Elegir "Jordan"
// dentro de Sneakers significa las dos cosas a la vez, que es lo que la
// persona quiere decir cuando lo pulsa. Una lista global de 54 marcas, en
// cambio, ofrece "Pokémon" mientras miras tenis.
//
// Se usa <details>/<summary> nativo y no un acordeón propio: trae el manejo de
// teclado, el rol de botón y el estado abierto/cerrado ya resueltos por el
// navegador.
//
// --- Los conteos son facetados, y eso NO es cosmético ---
//
// El número de cada opción se calcula contra el catálogo ya filtrado por los
// OTROS ejes, no contra el catálogo entero. Si no, un tramo de precio podría
// decir 27 y al pulsarlo dar 0 resultados: cada opción sería una posible vía
// muerta. Así, un 0 nunca se ofrece — las opciones sin piezas ni se pintan.

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
import {
  CATALOG_GROUPS,
  catalogPathOf,
  matchesCatalogNode,
  groupOfNode,
  ALL_NODE,
  groupNode,
  childNode,
} from '@/lib/product-taxonomy';
import { brandOf } from '@/lib/product-brand';

const PAGE_SIZE = 24;

// Cuántas marcas se ven dentro de una rama antes de "Ver todas". Con el árbol
// esto ya casi no se usa —dentro de Sneakers hay 19 marcas, no 54— pero
// Accesorios sigue teniendo suficientes para necesitarlo.
const BRANDS_VISIBLE = 10;

interface CatalogGridProps {
  products: Product[];
}

interface Filters {
  tab: DiscoveryTab;
  node: string;       // ALL_NODE | 'g:<grupo>' | 'c:<hijo>'
  brand: string;      // 'TODAS' o nombre de marca
  band: PriceBandId;  // 'ALL' o id de PRICE_BANDS
}

const NO_FILTERS: Filters = { tab: 'ALL', node: ALL_NODE, brand: 'TODAS', band: 'ALL' };

type AxisKey = 'tab' | 'node' | 'brand' | 'band';

// Un predicado por eje. `index` es la posición en el catálogo COMPLETO: la
// pestaña MOST DROPPED la usa como respaldo cuando el producto no trae
// `publishedAt` real (ver discovery.ts). Antes se pasaba la posición dentro
// del arreglo YA filtrado, así que "recién llegado" cambiaba de significado
// según qué otro filtro estuviera puesto.
const AXES: Record<AxisKey, (p: Product, i: number, f: Filters) => boolean> = {
  tab: (p, i, f) => matchesDiscoveryTab(p, f.tab, i),
  node: (p, _i, f) => matchesCatalogNode(p, f.node),
  brand: (p, _i, f) => f.brand === 'TODAS' || brandOf(p) === f.brand,
  band: (p, _i, f) => matchesPriceBand(p, f.band),
};

const AXIS_KEYS = Object.keys(AXES) as AxisKey[];

export function CatalogGrid({ products }: CatalogGridProps) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [expandedBrands, setExpandedBrands] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { addItem } = useCart();
  const { t } = useApp();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  // El catálogo filtrado por todos los ejes MENOS el que se pasa — la base
  // sobre la que se cuenta ese eje. Con `except` en null es el resultado final.
  const subsetExcept = useMemo(() => {
    const cache = new Map<string, Product[]>();
    return (...except: AxisKey[]): Product[] => {
      const key = except.join('|') || '*';
      const hit = cache.get(key);
      if (hit) return hit;
      const out = products.filter((p, i) => AXIS_KEYS.every((k) => except.includes(k) || AXES[k](p, i, filters)));
      cache.set(key, out);
      return out;
    };
  }, [products, filters]);

  const filtered = useMemo(() => subsetExcept(), [subsetExcept]);

  // Conteos del árbol: una pasada sobre el catálogo sin filtrar por nodo.
  const treeCounts = useMemo(() => {
    const base = subsetExcept('node');
    const groups = new Map<string, number>();
    const children = new Map<string, number>();
    for (const p of base) {
      const { group, child } = catalogPathOf(p);
      if (group) groups.set(group, (groups.get(group) ?? 0) + 1);
      if (child) children.set(child, (children.get(child) ?? 0) + 1);
    }
    return { groups, children, total: base.length };
  }, [subsetExcept]);

  // Marcas DENTRO de una rama: se cuentan sobre las piezas de ese grupo,
  // respetando el hijo seleccionado si pertenece a esa misma rama. Sin eso,
  // abrir Accesorios con "Relojes" puesto ofrecería marcas de gorras.
  const brandsInGroup = useMemo(() => {
    const base = subsetExcept('node', 'brand');
    const selectedGroup = groupOfNode(filters.node);
    const selectedChild = filters.node.startsWith('c:') ? filters.node.slice(2) : null;

    return (groupKey: string) => {
      const counts = new Map<string, number>();
      for (const p of base) {
        const path = catalogPathOf(p);
        if (path.group !== groupKey) continue;
        if (selectedChild && selectedGroup === groupKey && path.child !== selectedChild) continue;
        const b = brandOf(p);
        if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    };
  }, [subsetExcept, filters.node]);

  const bandOptions = useMemo(() => {
    const base = subsetExcept('band');
    return PRICE_BANDS.map((b) => ({
      key: b.id,
      label: b.label,
      count: base.filter((p) => matchesPriceBand(p, b.id)).length,
      // La opción ACTIVA se mantiene visible aunque su conteo caiga a 0: si la
      // pastilla encendida desaparece, la persona ve un catálogo vacío sin
      // ninguna pista de cuál de sus filtros lo dejó así.
    })).filter((b) => b.count > 0 || b.key === filters.band);
  }, [subsetExcept, filters.band]);

  // La rama del filtro activo se abre sola: si alguien llega con "Gorras"
  // puesto y todas las ramas cerradas, no hay forma de ver qué está filtrando.
  useEffect(() => {
    const g = groupOfNode(filters.node);
    if (g) setOpenGroups((prev) => (prev.includes(g) ? prev : [...prev, g]));
  }, [filters.node]);

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
    filters.tab !== 'ALL' || filters.node !== ALL_NODE || filters.brand !== 'TODAS' || filters.band !== 'ALL';

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    addItem(product.title, product.id, product.images[0], variant);
  };

  const toggleGroup = (key: string, open: boolean) =>
    setOpenGroups((prev) => (open ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((k) => k !== key)));

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
              onClick={() => { setFilters(NO_FILTERS); setExpandedBrands([]); }}
              className="rounded-full border border-border px-3.5 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wide text-zinc-400 transition hover:border-[#FF1E42] hover:text-foreground"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {/* Categorías: cuatro puertas, todo lo demás cuelga de ellas. */}
          {CATALOG_GROUPS.map((group) => {
            const count = treeCounts.groups.get(group.key) ?? 0;
            const isSelectedGroup = groupOfNode(filters.node) === group.key;
            if (count === 0 && !isSelectedGroup) return null;

            const brands = brandsInGroup(group.key);
            const showAll = expandedBrands.includes(group.key);
            const topBrands = showAll ? brands : brands.slice(0, BRANDS_VISIBLE);
            // La marca activa siempre se ve, aunque esté fuera de las primeras:
            // un filtro puesto sin pastilla encendida que lo delate es un
            // catálogo que se ve roto.
            const selectedBrand = brands.find((b) => b.key === filters.brand);
            const visibleBrands =
              selectedBrand && !topBrands.includes(selectedBrand) ? [...topBrands, selectedBrand] : topBrands;

            return (
              <details
                key={group.key}
                open={openGroups.includes(group.key)}
                onToggle={(e) => toggleGroup(group.key, (e.currentTarget as HTMLDetailsElement).open)}
                className="group"
              >
                <summary
                  className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition select-none marker:hidden [&::-webkit-details-marker]:hidden ${
                    isSelectedGroup ? 'bg-[#FF1E42]/10' : 'hover:bg-muted'
                  }`}
                >
                  <Chevron />
                  <span
                    className={`flex-1 font-mono text-xs font-bold uppercase tracking-wide ${
                      isSelectedGroup ? 'text-[#FF1E42]' : 'text-foreground'
                    }`}
                  >
                    {group.label}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
                </summary>

                <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Pill
                      active={filters.node === groupNode(group.key)}
                      count={count}
                      onClick={() => set({ node: groupNode(group.key), brand: 'TODAS' })}
                    >
                      Todo {group.label}
                    </Pill>
                    {group.children.map((child) => {
                      const c = treeCounts.children.get(child.key) ?? 0;
                      if (c === 0 && filters.node !== childNode(child.key)) return null;
                      return (
                        <Pill
                          key={child.key}
                          active={filters.node === childNode(child.key)}
                          count={c}
                          onClick={() => set({ node: childNode(child.key), brand: 'TODAS' })}
                        >
                          {child.label}
                        </Pill>
                      );
                    })}
                  </div>

                  {brands.length > 0 && (
                    <div className="space-y-2 border-t border-border/60 pt-3">
                      {/* El rótulo nombra lo que de verdad se está listando:
                          con "Relojes" puesto, estas son las marcas de relojes,
                          no las de accesorios. Decir "en accesorios" mientras
                          se ven cuatro relojeras es un número correcto con una
                          etiqueta que miente. */}
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                        // Marcas en{' '}
                        {(isSelectedGroup &&
                          group.children.find((c) => filters.node === childNode(c.key))?.label) ||
                          group.label}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Pill
                          active={filters.brand === 'TODAS'}
                          count={brands.reduce((a, b) => a + b.count, 0)}
                          onClick={() => set({ brand: 'TODAS' })}
                        >
                          Todas
                        </Pill>
                        {visibleBrands.map((b) => (
                          <Pill
                            key={b.key}
                            active={filters.brand === b.key}
                            count={b.count}
                            onClick={() =>
                              set({
                                brand: b.key,
                                // Elegir una marca dentro de una rama significa
                                // las dos cosas: esa marca, en esa rama.
                                node: isSelectedGroup ? filters.node : groupNode(group.key),
                              })
                            }
                          >
                            {b.key}
                          </Pill>
                        ))}
                        {brands.length > BRANDS_VISIBLE && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedBrands((prev) =>
                                prev.includes(group.key) ? prev.filter((k) => k !== group.key) : [...prev, group.key]
                              )
                            }
                            className="rounded-full border border-dashed border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400 transition hover:border-[#FF1E42] hover:text-foreground"
                          >
                            {showAll ? 'Ver menos' : `Ver todas (${brands.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            );
          })}

          {/* Precio y Colección: mismo trato que las categorías — cerrados
              hasta que alguien los pide. */}
          <FilterDrawer
            label="Precio"
            hint="MXN"
            active={filters.band !== 'ALL'}
            open={openGroups.includes('__precio')}
            onToggle={(o) => toggleGroup('__precio', o)}
          >
            <Pill active={filters.band === 'ALL'} count={subsetExcept('band').length} onClick={() => set({ band: 'ALL' })}>
              Cualquiera
            </Pill>
            {bandOptions.map((b) => (
              <Pill key={b.key} active={filters.band === b.key} count={b.count} onClick={() => set({ band: b.key })}>
                {b.label}
              </Pill>
            ))}
          </FilterDrawer>

          <FilterDrawer
            label="Colección"
            hint="Cruza con lo de arriba"
            active={filters.tab !== 'ALL'}
            open={openGroups.includes('__coleccion')}
            onToggle={(o) => toggleGroup('__coleccion', o)}
          >
            <DiscoveryTabs active={filters.tab} onChange={(tab) => set({ tab })} />
          </FilterDrawer>
        </div>

        {/* Todo el catálogo: fuera del acordeón, porque salir de un filtro no
            debería exigir abrir la rama en la que te metiste. */}
        {filters.node !== ALL_NODE && (
          <button
            type="button"
            onClick={() => set({ node: ALL_NODE, brand: 'TODAS' })}
            className="self-start font-mono text-[10px] uppercase tracking-widest text-zinc-400 underline-offset-4 transition hover:text-foreground hover:underline"
          >
            ← Ver todo el catálogo ({treeCounts.total})
          </button>
        )}
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

// Flecha de la rama. Gira con `group-open` en vez de con estado de React: el
// navegador ya sabe si el <details> está abierto, no hace falta contárselo.
function Chevron() {
  return (
    <svg
      className="h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// Una rama que no es de categoría (Precio, Colección). Misma forma que las
// otras para que el acordeón se lea como una sola lista.
function FilterDrawer({
  label,
  hint,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  hint?: string;
  active: boolean;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details open={open} onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)} className="group">
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition select-none marker:hidden [&::-webkit-details-marker]:hidden ${
          active ? 'bg-[#FF1E42]/10' : 'hover:bg-muted'
        }`}
      >
        <Chevron />
        <span className={`font-mono text-xs font-bold uppercase tracking-wide ${active ? 'text-[#FF1E42]' : 'text-foreground'}`}>
          {label}
        </span>
        {hint && <span className="font-mono text-[9px] uppercase tracking-wide text-zinc-500">// {hint}</span>}
      </summary>
      <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 px-4 py-4">{children}</div>
    </details>
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
