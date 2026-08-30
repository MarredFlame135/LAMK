// src/app/(routes)/admin/inventario/page.tsx
//
// Fase D.6. Distinta de /admin/inventory (con "y", legacy — redirige a
// /admin/offline-sales, es la herramienta de ocultar/mostrar productos).
// Esta ruta nueva es analítica: rotación, antigüedad, señal de
// reposición/descuento por pieza — no edita nada, solo informa.

import React from 'react';
import { getInventoryAnalytics } from '@/lib/shopify/inventory-analytics';
import { InventoryAnalyticsTable } from '@/components/admin/InventoryAnalyticsTable';

export const dynamic = 'force-dynamic';

export default async function AdminInventarioPage() {
  const { rows, salesDataAvailable } = await getInventoryAnalytics();

  return (
    <div className="p-6 bg-background text-foreground space-y-6">
      <div className="border-b border-border pb-4">
        <a href="/admin" className="text-[10px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-widest transition">← Panel de Mando</a>
        <span className="block text-xs font-mono text-[#FF1E42] uppercase tracking-widest mt-1">// INVENTARIO Y PRODUCTOS</span>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight mt-1">Rotación y señal de reposición</h1>
      </div>

      <InventoryAnalyticsTable rows={rows} salesDataAvailable={salesDataAvailable} />
    </div>
  );
}
