// src/components/admin/AdminOverview.tsx
//
// Fase D.3: Panel de Mando. Disciplina "terminal financiera" (Parte II del
// brief) — tipografía mono, densidad, cero animación de entrada vistosa,
// jerarquía por peso no por color. Seis cifras reales, nunca inventadas:
// las que no tienen fuente de datos real hoy (margen sin permiso de
// Shopify, XP sin sistema de canje) se muestran como tales, no se ocultan
// ni se fingen.

import React from 'react';
import { DashboardFinance } from '@/lib/shopify/finance';

function formatMxn(n: number): string {
  return `$${Math.round(n).toLocaleString('es-MX')}`;
}

function Kpi({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`text-2xl font-mono font-bold tabular-nums mt-1 ${warn ? 'text-[#FF1E42]' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] font-mono text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminOverview({ finance }: { finance: DashboardFinance | null }) {
  if (!finance) {
    return (
      <div className="p-5 bg-card border border-amber-900/50 rounded-lg text-xs text-amber-400">
        La Admin API de Shopify no está configurada — el Panel de Mando necesita <code className="font-mono">SHOPIFY_ADMIN_API_ACCESS_TOKEN</code> y{' '}
        <code className="font-mono">SHOPIFY_ADMIN_API_STORE_DOMAIN</code> para traer pedidos reales.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="Ventas hoy" value={formatMxn(finance.salesToday)} sub={`${finance.salesTodayOrders} pedido(s)`} />
        <Kpi label="Ventas mes" value={formatMxn(finance.salesMonth)} sub={`${finance.salesMonthOrders} pedido(s)`} />
        <Kpi
          label="Pedidos por surtir"
          value={String(finance.ordersToFulfill)}
          sub={finance.ordersOverdue48h > 0 ? `⚠ ${finance.ordersOverdue48h} con más de 48h` : undefined}
          warn={finance.ordersOverdue48h > 0}
        />
        <Kpi label="Ticket promedio" value={formatMxn(finance.avgTicket)} sub="este mes" />
        <Kpi
          label="Margen bruto mes"
          value={finance.grossMarginPct !== null ? `${finance.grossMarginPct}%` : '—'}
          sub={finance.grossMarginPct !== null ? undefined : 'Sin permiso "View product costs" en la Admin API'}
        />
        <Kpi label="XP en circulación" value={finance.xpOutstanding.toLocaleString('es-MX')} sub="sin sistema de canje construido todavía" />
      </div>

      {finance.ordersOverdue48h > 0 && (
        <div className="p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-xs text-red-300 flex items-center justify-between gap-3">
          <span>{finance.ordersOverdue48h} pedido(s) sin surtir con más de 48 horas de antigüedad.</span>
          <a href="/admin/offline-sales" className="font-bold uppercase tracking-wide whitespace-nowrap hover:underline">Ver →</a>
        </div>
      )}
    </div>
  );
}
