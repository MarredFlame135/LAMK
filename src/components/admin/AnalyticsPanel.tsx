// src/components/admin/AnalyticsPanel.tsx
//
// Dashboard analítico del admin, construido siguiendo el skill de dataviz:
// forma antes que color, color asignado por el trabajo que hace (secuencial
// para magnitud, categórico para identidad), paleta validada contra nuestra
// superficie real (#0E0E13) con scripts/validate_palette.js, marcas finas
// con extremos redondeados, grilla recesiva, tooltip por barra.
//
// Fuentes de datos, todas reales (nada inventado):
//  - Ventas físicas: servidor (src/lib/sales-store.ts) vía /api/admin/sales
//  - Más deseados: vistas reales por producto (src/lib/hype.ts) vía /api/admin/analytics
//  - Demanda de agotados: peticiones reales capturadas por TENISIN (useLeads, servidor)
//  - Ventas/top-sellers de Shopify: requieren Admin API con scopes — estado vacío honesto

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, PackageX, ShoppingBag, Lock } from 'lucide-react';
import { OfflineSale } from '@/types/admin';
import { useLeads } from '@/hooks/useLeads';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { Product } from '@/types/product';

// Paleta categórica validada (dataviz skill, dark mode, superficie #0E0E13) —
// ver scripts/validate_palette.js. Orden fijo, nunca se reasigna por ranking.
const CATEGORY_COLORS: Record<string, string> = {
  SNEAKERS: '#3987e5',
  APPAREL: '#d95926',
  ACCESSORIES: '#199e70',
  COLLECTIBLES: '#c98500',
  JEWELRY: '#d55181',
};
const SEQUENTIAL_RED = '#FF1E42'; // hue único de marca para magnitud (ventas, vistas)

interface TopViewedItem {
  id: string;
  title: string;
  brand: string;
  category: Product['category'];
  views: number;
  stockRemaining: number;
}

function useOfflineSalesReadOnly(): OfflineSale[] {
  const [sales, setSales] = useState<OfflineSale[]>([]);
  useEffect(() => {
    fetch('/api/admin/sales')
      .then((r) => r.json())
      .then((d) => setSales(d.sales || []))
      .catch((e) => console.error('Error al leer ventas offline para analíticas:', e));
  }, []);
  return sales;
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-MX', { month: 'short' });
}

// --- Stat tile ---
function StatTile({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="p-4 bg-[#0E0E13] border border-zinc-800 rounded-xl shadow-lg shadow-black/20 space-y-1">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {hint && <p className="text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
}

// --- Gráfico de barras verticales, un solo hue (secuencial): ventas por mes ---
function MonthlyRevenueChart({ sales }: { sales: OfflineSale[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => {
      const key = monthKey(s.createdAt);
      map.set(key, (map.get(key) || 0) + s.totalAmount);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [sales]);

  const max = Math.max(1, ...byMonth.map(([, v]) => v));

  if (byMonth.length === 0) {
    return <p className="text-xs text-zinc-500 py-8 text-center">Aún no hay ventas registradas para graficar.</p>;
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-3 h-40 border-b border-zinc-800/80 pb-1">
        {byMonth.map(([key, value]) => {
          const heightPct = Math.max(4, (value / max) * 100);
          return (
            <div key={key} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 relative">
              {hovered === key && (
                <div className="absolute -top-7 px-2 py-1 bg-black border border-zinc-700 rounded text-[10px] text-white font-mono whitespace-nowrap z-10">
                  ${value.toLocaleString()} MXN
                </div>
              )}
              <div
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                className="w-full max-w-[28px] rounded-t-[4px] transition-opacity hover:opacity-80 cursor-default"
                style={{ height: `${heightPct}%`, backgroundColor: SEQUENTIAL_RED }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-1.5">
        {byMonth.map(([key]) => (
          <span key={key} className="flex-1 text-center text-[9px] font-mono text-zinc-500 uppercase">
            {monthLabel(key)}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Gráfico de barras horizontales, un solo hue: ranking por vistas reales ---
function TopViewedChart({ items }: { items: TopViewedItem[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.views));

  if (items.length === 0) {
    return <p className="text-xs text-zinc-500 py-8 text-center">Aún no hay vistas registradas — se llenan cuando alguien visita una ficha de producto.</p>;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const widthPct = Math.max(3, (item.views / max) * 100);
        return (
          <div key={item.id} className="flex items-center gap-3 text-xs">
            <span className="w-32 sm:w-40 truncate text-zinc-300">{item.title}</span>
            <div className="flex-1 h-4 bg-zinc-900 rounded-[4px] overflow-hidden relative">
              <div
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className="h-full rounded-[4px] transition-opacity hover:opacity-80"
                style={{ width: `${widthPct}%`, backgroundColor: SEQUENTIAL_RED }}
              />
              {hovered === item.id && (
                <div className="absolute inset-y-0 left-2 flex items-center text-[10px] text-white font-mono">
                  {item.views} vistas · {item.stockRemaining} disp.
                </div>
              )}
            </div>
            <span className="w-8 text-right font-mono text-zinc-400">{item.views}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Barras categóricas: demanda de agotados por categoría (paleta validada) ---
function DemandByCategoryChart({ counts }: { counts: Record<string, number> }) {
  const entries = (Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>)
    .map((cat) => ({ cat, count: counts[cat] || 0 }))
    .filter((e) => e.count > 0);

  const max = Math.max(1, ...entries.map((e) => e.count));

  if (entries.length === 0) {
    return <p className="text-xs text-zinc-500 py-8 text-center">Sin peticiones de restock todavía.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {entries.map(({ cat, count }) => (
          <div key={cat} className="flex items-center gap-3 text-xs">
            <span className="w-24 text-zinc-300 truncate">{CATEGORY_LABELS[cat as Product['category']]}</span>
            <div className="flex-1 h-3 bg-zinc-900 rounded-[4px] overflow-hidden">
              <div
                className="h-full rounded-[4px]"
                style={{ width: `${Math.max(4, (count / max) * 100)}%`, backgroundColor: CATEGORY_COLORS[cat] }}
              />
            </div>
            <span className="w-6 text-right font-mono text-zinc-400">{count}</span>
          </div>
        ))}
      </div>
      {/* Leyenda (identidad nunca solo por color) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-zinc-800/60">
        {entries.map(({ cat }) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            <span className="text-[10px] text-zinc-400 font-mono">{CATEGORY_LABELS[cat as Product['category']]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPanel() {
  const sales = useOfflineSalesReadOnly();
  const { leads } = useLeads();
  const [topViewed, setTopViewed] = useState<TopViewedItem[]>([]);
  const [productsById, setProductsById] = useState<Record<string, Product['category']>>({});

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => res.json())
      .then((data) => {
        setTopViewed(data.topViewed || []);
        const map: Record<string, Product['category']> = {};
        (data.products || []).forEach((p: any) => { map[p.id] = p.category; });
        setProductsById(map);
      })
      .catch((err) => console.error('Error al cargar analíticas:', err));
  }, []);

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const pendingLeads = leads.filter((l) => !l.wasMatched && !l.notified);

  const demandByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.filter((l) => !l.wasMatched).forEach((l) => {
      const cat = productsById[l.productId];
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [leads, productsById]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-100">DASHBOARD DE OPERACIÓN E INTELIGENCIA</h3>
        <span className="text-[9px] font-mono text-zinc-600 uppercase">Datos reales — sin cifras simuladas</span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile icon={TrendingUp} label="Ventas Físicas Totales" value={`$${totalRevenue.toLocaleString()} MXN`} hint={`${sales.length} ventas registradas`} />
        <StatTile icon={ShoppingBag} label="Pares Más Vistos" value={String(topViewed[0]?.views ?? 0)} hint={topViewed[0]?.title || '—'} />
        <StatTile icon={PackageX} label="Demanda de Agotados" value={String(pendingLeads.length)} hint="peticiones sin atender" />
        <StatTile icon={Lock} label="Ventas Shopify (Orders)" value="—" hint="requiere Admin API" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-[#0E0E13] border border-zinc-800 rounded-xl shadow-lg shadow-black/20">
          <h4 className="font-display text-xs font-black uppercase tracking-wide text-zinc-200 mb-4">Ventas Físicas por Mes</h4>
          <MonthlyRevenueChart sales={sales} />
        </div>

        <div className="p-5 bg-[#0E0E13] border border-zinc-800 rounded-xl shadow-lg shadow-black/20">
          <h4 className="font-display text-xs font-black uppercase tracking-wide text-zinc-200 mb-4">Top Pares Más Deseados (vistas reales 24h)</h4>
          <TopViewedChart items={topViewed} />
        </div>

        <div className="p-5 bg-[#0E0E13] border border-zinc-800 rounded-xl shadow-lg shadow-black/20">
          <h4 className="font-display text-xs font-black uppercase tracking-wide text-zinc-200 mb-4">Demanda Acumulada de Agotados por Categoría</h4>
          <DemandByCategoryChart counts={demandByCategory} />
        </div>

        {/* Estado vacío honesto: no hay orders reales de Shopify todavía */}
        <div className="p-5 bg-[#0E0E13] border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center space-y-2 min-h-[200px]">
          <Lock className="h-6 w-6 text-zinc-600" />
          <h4 className="text-xs font-bold uppercase text-zinc-400">Top / Bottom Sellers de Shopify</h4>
          <p className="text-[11px] text-zinc-500 max-w-xs">
            Tu token actual no tiene scopes de Admin API (read_orders/read_products). Actívalos en
            Shopify Admin → tu app → Configuración → Admin API, y pásame el nuevo token para
            activar este gráfico con ventas reales.
          </p>
        </div>
      </div>
    </div>
  );
}
