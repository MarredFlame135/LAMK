// src/app/(routes)/admin/finanzas/page.tsx
//
// Fase D.4. "Capital inmovilizado" y "días de inventario" son las dos
// cifras que el brief marca como *la* métrica que separa un negocio sano
// de una bodega cara — ambas reales aquí, nunca estimadas sin decirlo.

import React from 'react';
import { getInventoryValuation, getDashboardFinance } from '@/lib/shopify/finance';
import { FinanceDetailTable } from '@/components/admin/FinanceDetailTable';

export const dynamic = 'force-dynamic';

function formatMxn(n: number): string {
  return `$${Math.round(n).toLocaleString('es-MX')}`;
}

export default async function AdminFinanzasPage() {
  const [valuation, dashboard] = await Promise.all([getInventoryValuation(), getDashboardFinance()]);

  // Proyección simple (brief D.4): ritmo de venta del mes en curso,
  // extrapolado a 30 días — no es un forecast estadístico, es una
  // extrapolación lineal honesta ("si el resto del mes se parece a lo que
  // llevas"), documentada como tal en la UI, no vendida como más de lo
  // que es.
  const now = new Date();
  const daysElapsed = now.getUTCDate();
  const dailyPace = dashboard && daysElapsed > 0 ? dashboard.salesMonth / daysElapsed : 0;
  const projection30d = dailyPace * 30;

  // Días de inventario: a ese mismo ritmo diario, cuánto tardaría en
  // venderse todo el valor de inventario actual (a precio de venta, o a
  // costo si está disponible — el costo es la cifra real que pide el
  // brief).
  const inventoryValue = valuation?.totalCostValue ?? valuation?.totalRetailValue ?? null;
  const daysOfInventory = inventoryValue !== null && dailyPace > 0 ? Math.round(inventoryValue / dailyPace) : null;

  return (
    <div className="p-6 bg-background text-foreground space-y-8">
      <div className="border-b border-border pb-4">
        <a href="/admin" className="text-[10px] font-mono text-zinc-400 hover:text-white uppercase tracking-widest transition">← Panel de Mando</a>
        <span className="block text-xs font-mono text-[#FF1E42] uppercase tracking-widest mt-1">// FINANZAS</span>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight mt-1">Margen, capital y proyección</h1>
      </div>

      {!dashboard || !valuation ? (
        <div className="p-6 bg-card border border-amber-900/50 rounded-lg text-xs text-amber-400">
          La Admin API de Shopify no está configurada — esta página necesita pedidos e inventario reales para calcular algo.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Capital inmovilizado</p>
              <p className="text-xl font-mono font-bold mt-1">{inventoryValue !== null ? formatMxn(inventoryValue) : '—'}</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">{valuation.costDataAvailable ? 'a costo real' : 'a precio de venta (sin costo real disponible)'}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Días de inventario</p>
              <p className="text-xl font-mono font-bold mt-1">{daysOfInventory !== null ? daysOfInventory : '—'}</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">al ritmo de venta de este mes</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Proyección 30 días</p>
              <p className="text-xl font-mono font-bold mt-1">{formatMxn(projection30d)}</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">extrapolación lineal, no forecast</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Margen bruto mes</p>
              <p className="text-xl font-mono font-bold mt-1">{dashboard.grossMarginPct !== null ? `${dashboard.grossMarginPct}%` : '—'}</p>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">sobre ventas del mes</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">// MARGEN Y VALOR POR CATEGORÍA</h2>
            <FinanceDetailTable categories={valuation.categories} costDataAvailable={valuation.costDataAvailable} />
          </div>
        </>
      )}
    </div>
  );
}
