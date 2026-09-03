// src/components/catalog/CatalogGrid.tsx
//
// Parte cliente del catálogo (filtros interactivos + micro-interacciones).
// Recibe TODOS los productos ya resueltos (Shopify real o mock, sin límite
// artificial — ver shopify/index.ts::getProducts) desde el Server Component
// en src/app/(routes)/catalog/page.tsx, y los renderiza progresivamente con
// scroll infinito para no bloquear el hilo principal pintando cientos de
// tarjetas de una sola vez.
//
// =========================================================================
//  Cómo se navega el catálogo (2026-09-03, ronda 4) — y por qué así
// =========================================================================
//
// Esta parte se rehízo tres veces el mismo día, así que vale la pena dejar
// escrito qué se probó y qué dijo la evidencia:
//
//   v1  Cuatro filas planas de pastillas (categorías, 54 marcas, precios,
//       colecciones), todo visible siempre. El cliente: "no quiero tantas
//       categorías". Setenta opciones que leer antes de elegir la primera.
//   v2  Acordeón: seis ramas <details> apiladas. Mejor, pero el cliente
//       insistió: "no es necesario stackear una tras otra, puede ser más
//       simple y menos estorboso". También tenía razón — seis renglones de
//       cabecera antes del primer producto siguen siendo un muro, solo que
//       más ordenado.
//   v3  Lo que hay ahora, y sale de mirar qué hacen las tiendas de verdad.
//
// --- Qué hacen las tiendas de referencia (revisado, no de memoria) ---
//
//   · La TIENDA ANTERIOR DEL PROPIO CLIENTE (Shopify, lookatmykicksmx.com):
//     las categorías y sus doce sub-colecciones viven en el MENÚ SUPERIOR;
//     la barra lateral solo tiene Disponibilidad, Precio y Marca. Categoría
//     y filtro son dos cosas distintas ahí.
//   · Nike MX: fila horizontal de "chips" de categoría (Calzado, Playeras,
//     Shorts, Sudaderas…) y aparte un panel de filtros con "Ocultar filtros".
//   · StockX: tira horizontal de categorías bajo el nav, filtros en panel.
//   · Shopify Dawn (el tema por defecto): panel en escritorio, CAJÓN en móvil.
//
// El patrón es el mismo en las cuatro: **la categoría es navegación, no un
// filtro**, y va arriba, corta y horizontal. Los atributos (marca, precio)
// son filtros y viven detrás de un control que se abre cuando alguien los
// pide. Nada de eso ocupa espacio permanente encima de los productos.
//
// --- Lo que se construyó ---
//
//   [Todo] [Sneakers] [Ropa] [Accesorios] [Coleccionables]   ← navegación
//      [Hoodies] [Playeras] [Chamarras] …                    ← solo si aplica
//   [Filtros · 2]   Jordan ×   $10,000+ ×   Limpiar todo     ← barra
//
// Dos renglones cortos en vez de seis, y el resto en un cajón lateral.
//
// **Las pastillas de filtro activo NO son adorno**: son el precio de meter los
// filtros en un cajón. Un filtro puesto que no se ve desde fuera es un
// catálogo que parece incompleto sin motivo aparente, y es el fallo clásico
// de este patrón. Cada una se quita con un clic, sin volver a abrir el cajón.
//
// El cajón es un `<dialog>` nativo con `showModal()`: la trampa de foco, la
// tecla Escape, el fondo inerte y el `::backdrop` los pone el navegador. Un
// panel propio serían cuarenta líneas para reimplementar peor lo mismo.
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
import { ProductCard } from './ProductCard';
import {
  DiscoveryTab,
  DISCOVERY_TABS,
  matchesDiscoveryTab,
  PRICE_BANDS,
  PriceBandId,
  matchesPriceBand,
} from '@/lib/discovery';
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

// Cuántas marcas se ven en el cajón antes de "Ver todas". Dentro de una
// categoría casi nunca hace falta (Sneakers tiene 15); sin categoría elegida
// son 54 y sí.
const BRANDS_VISIBLE = 12;

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { addItem } = useCart();
  const { t } = useApp();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  // El catálogo filtrado por todos los ejes MENOS los que se pasen — la base
  // sobre la que se cuenta ese eje. Sin argumentos, es el resultado final.
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

  const selectedGroup = groupOfNode(filters.node);
  const activeGroup = CATALOG_GROUPS.find((g) => g.key === selectedGroup) ?? null;
  const selectedChild = filters.node.startsWith('c:') ? filters.node.slice(2) : null;

  // Conteos del árbol: una sola pasada sobre el catálogo sin filtrar por nodo.
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
      key: b.id,
      label: b.label,
      count: base.filter((p) => matchesPriceBand(p, b.id)).length,
      // La opción ACTIVA se mantiene visible aunque su conteo caiga a 0: si la
      // pastilla encendida desaparece, la persona ve un catálogo vacío sin
      // ninguna pista de cuál de sus filtros lo dejó así.
    })).filter((b) => b.count > 0 || b.key === filters.band);
  }, [subsetExcept, filters.band]);

  const tabOptions = useMemo(() => {
    const base = subsetExcept('tab');
    return DISCOVERY_TABS.map((tab) => ({
      ...tab,
      count: base.filter((p, i) => matchesDiscoveryTab(p, tab.id, i)).length,
    })).filter((tab) => tab.count > 0 || tab.id === filters.tab);
  }, [subsetExcept, filters.tab]);

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

  // Solo cuentan marca, precio y colección: la categoría no es un "filtro
  // puesto", es dónde estás parado, y ya se ve encendida en la fila de arriba.
  const activeFilters = [
    filters.brand !== 'TODAS' && { key: 'brand' as const, label: filters.brand, clear: () => set({ brand: 'TODAS' }) },
    filters.band !== 'ALL' && {
      key: 'band' as const,
      label: PRICE_BANDS.find((b) => b.id === filters.band)?.label ?? '',
      clear: () => set({ band: 'ALL' }),
    },
    filters.tab !== 'ALL' && {
      key: 'tab' as const,
      label: DISCOVERY_TABS.find((d) => d.id === filters.tab)?.label ?? '',
      clear: () => set({ tab: 'ALL' }),
    },
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    addItem(product.title, product.id, product.images[0], variant);
  };

  const visibleBrands = (() => {
    if (showAllBrands) return brandOptions;
    const top = brandOptions.slice(0, BRANDS_VISIBLE);
    // La marca activa siempre se ve: un filtro puesto sin su pastilla
    // encendida es un cajón que miente sobre su propio estado.
    const sel = brandOptions.find((b) => b.key === filters.brand);
    return sel && !top.includes(sel) ? [...top, sel] : top;
  })();

  return (
    <div className="max-w-7xl mx-auto p-6 bg-background text-foreground min-h-screen space-y-6">

      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-4 border-b border-border pb-5">
        <div>
          <span className="text-xs font-mono text-[#FF1E42] uppercase">{t.catalogPage.eyebrow}</span>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">{t.catalogPage.title}</h1>
        </div>

        {/* Navegación de categoría: horizontal y corta, como en las cuatro
            tiendas revisadas. No es un filtro, es dónde estás parado. */}
        <nav className="flex flex-wrap gap-2" aria-label="Categorías">
          <Chip active={filters.node === ALL_NODE} onClick={() => set({ node: ALL_NODE })}>
            Todo
          </Chip>
          {CATALOG_GROUPS.map((group) => {
            const count = treeCounts.groups.get(group.key) ?? 0;
            if (count === 0 && selectedGroup !== group.key) return null;
            return (
              <Chip
                key={group.key}
                active={selectedGroup === group.key}
                count={count}
                onClick={() => set({ node: groupNode(group.key) })}
              >
                {group.label}
              </Chip>
            );
          })}
        </nav>

        {/* Subcategorías: solo cuando la categoría abierta tiene, y solo esa.
            Es el segundo renglón de Nike, no una lista permanente. */}
        {activeGroup && activeGroup.children.length > 0 && (
          <nav className="flex flex-wrap gap-2 -mt-1" aria-label={`Subcategorías de ${activeGroup.label}`}>
            {activeGroup.children.map((child) => {
              const count = treeCounts.children.get(child.key) ?? 0;
              if (count === 0 && selectedChild !== child.key) return null;
              const isActive = selectedChild === child.key;
              return (
                <Chip
                  key={child.key}
                  small
                  active={isActive}
                  count={count}
                  // Volver a pulsar la activa sube un nivel: sin esto, salir de
                  // una subcategoría obliga a pasar por "Todo" y perder la
                  // categoría en la que estabas.
                  onClick={() => set({ node: isActive ? groupNode(activeGroup.key) : childNode(child.key) })}
                >
                  {child.label}
                </Chip>
              );
            })}
          </nav>
        )}

        {/* Barra: el botón del cajón, lo que hay puesto, y el conteo. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-[11px] font-bold font-mono uppercase tracking-wide text-foreground transition hover:border-zinc-500"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            Filtros
            {activeFilters.length > 0 && (
              <span className="rounded-full bg-[#FF1E42] px-1.5 text-[9px] leading-4 text-white">{activeFilters.length}</span>
            )}
          </button>

          {activeFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.clear}
              className="flex items-center gap-1.5 rounded-full border border-[#FF1E42] bg-[#FF1E42]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#FF1E42] transition hover:bg-[#FF1E42]/20"
              aria-label={`Quitar filtro ${f.label}`}
            >
              {f.label}
              <span aria-hidden className="text-[11px] leading-none">×</span>
            </button>
          ))}

          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={() => { setFilters((prev) => ({ ...NO_FILTERS, node: prev.node })); setShowAllBrands(false); }}
              className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 underline-offset-4 transition hover:text-foreground hover:underline"
            >
              Limpiar
            </button>
          )}

          <span className="ml-auto font-mono text-[11px] text-zinc-400">
            {filtered.length} pieza{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </motion.div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} count={filtered.length}>
        <DrawerSection title="Marca" hint={`${brandOptions.length} con piezas`}>
          <Pill active={filters.brand === 'TODAS'} count={subsetExcept('brand').length} onClick={() => set({ brand: 'TODAS' })}>
            Todas
          </Pill>
          {visibleBrands.map((b) => (
            <Pill key={b.key} active={filters.brand === b.key} count={b.count} onClick={() => set({ brand: b.key })}>
              {b.key}
            </Pill>
          ))}
          {brandOptions.length > BRANDS_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAllBrands((v) => !v)}
              className="rounded-full border border-dashed border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400 transition hover:border-[#FF1E42] hover:text-foreground"
            >
              {showAllBrands ? 'Ver menos' : `Ver todas (${brandOptions.length})`}
            </button>
          )}
        </DrawerSection>

        <DrawerSection title="Precio" hint="MXN">
          <Pill active={filters.band === 'ALL'} count={subsetExcept('band').length} onClick={() => set({ band: 'ALL' })}>
            Cualquiera
          </Pill>
          {bandOptions.map((b) => (
            <Pill key={b.key} active={filters.band === b.key} count={b.count} onClick={() => set({ band: b.key })}>
              {b.label}
            </Pill>
          ))}
        </DrawerSection>

        <DrawerSection title="Colección" hint="Cruza con la categoría">
          <Pill active={filters.tab === 'ALL'} count={subsetExcept('tab').length} onClick={() => set({ tab: 'ALL' })}>
            Todas
          </Pill>
          {tabOptions.map((tab) => (
            <Pill key={tab.id} active={filters.tab === tab.id} count={tab.count} onClick={() => set({ tab: tab.id })}>
              {tab.label}
            </Pill>
          ))}
        </DrawerSection>
      </FilterDrawer>

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

// Cajón de filtros. `<dialog>` + `showModal()` y no un panel propio: el
// navegador aporta trampa de foco, Escape, fondo inerte y `::backdrop`. La
// alternativa es reimplementar las cuatro cosas, peor.
function FilterDrawer({
  open,
  onClose,
  count,
  children,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // El panel entra deslizándose. La clase se aplica un frame DESPUÉS de
  // abrir: <dialog> pasa a `display:block` al llamar showModal(), y sin ese
  // frame el navegador no tiene un estado inicial desde el que animar.
  const [slid, setSlid] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      requestAnimationFrame(() => setSlid(true));
    } else if (!open && el.open) {
      setSlid(false);
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clic en el ::backdrop: el evento cae en el propio <dialog> (el panel
      // está dentro), así que basta comprobar que el objetivo es el diálogo.
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      /* `fixed inset-y-0 right-0` explícito: la hoja de estilos del navegador
         le da al <dialog> `position: absolute` con `margin: auto`, y con solo
         `h-full` el panel quedaba despegado del borde superior en móvil. */
      className="fixed inset-y-0 right-0 m-0 h-full max-h-full w-full max-w-sm bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div
        className={`flex h-full flex-col border-l border-border bg-card text-foreground transition-transform duration-300 ease-out motion-reduce:transition-none ${
          slid ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em]">// Filtros</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold font-mono uppercase text-zinc-400 transition hover:border-[#FF1E42] hover:text-foreground"
            aria-label="Cerrar filtros"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>

        {/* El conteo va también aquí abajo: con el cajón abierto tapa la
            rejilla, así que sin este número no hay forma de ver el efecto de
            lo que acabas de pulsar sin cerrarlo. */}
        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[#FF1E42] px-4 py-3 text-[11px] font-black font-mono uppercase tracking-widest text-white transition hover:bg-[#e0182f]"
          >
            Ver {count} pieza{count !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function DrawerSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline gap-2">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
        {hint && <span className="font-mono text-[9px] uppercase tracking-wide text-zinc-500">// {hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

// Pastilla de NAVEGACIÓN (categoría). Más grande y con más peso que las del
// cajón: es lo primero que se lee de la página.
function Chip({
  active,
  count,
  small,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  small?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`flex items-center gap-1.5 rounded-lg border font-bold uppercase tracking-wide transition ${
        small ? 'px-3 py-1.5 text-[10px]' : 'px-4 py-2 text-[11px]'
      } ${
        active
          ? 'border-[#FF1E42] bg-[#FF1E42] text-white'
          : 'border-border bg-muted text-muted-foreground hover:border-zinc-500 hover:text-foreground'
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`font-mono text-[9px] ${active ? 'text-white/70' : 'opacity-60'}`}>{count}</span>
      )}
    </button>
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
