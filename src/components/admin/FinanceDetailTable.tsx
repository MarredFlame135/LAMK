// src/components/admin/FinanceDetailTable.tsx
//
// Fase D.4. Tabla de margen/capital por categoría + exportación CSV
// ("en toda vista", brief D.4).

'use client';

import React from 'react';
import { CategoryValuation } from '@/lib/shopify/finance';

function toCsv(rows: CategoryValuation[]): string {
  const header = ['Categoría', 'Unidades en stock', 'Valor a precio de venta MXN', 'Costo real MXN', 'Margen %'];
  const lines = rows.map((r) =>
    [r.category, r.unitsInStock, Math.round(r.retailValue), r.costValue !== null ? Math.round(r.costValue) : '', r.marginPct ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FinanceDetailTable({ categories, costDataAvailable }: { categories: CategoryValuation[]; costDataAvailable: boolean }) {
  if (categories.length === 0) {
    return <div className="p-8 border border-dashed border-border rounded-lg text-center text-zinc-500 text-xs">Sin datos de inventario disponibles.</div>;
  }

  return (
    <div className="space-y-3">
      {!costDataAvailable && (
        <div className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-lg text-[11px] text-amber-400">
          Sin permiso "View product costs" (o sin scope <code className="font-mono">read_products</code>) en la Admin API — solo se muestra valor a precio de venta, no costo real ni margen. El "capital inmovilizado" real requiere esto.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => downloadCsv(toCsv(categories), `lamk-finanzas-categorias-${new Date().toISOString().slice(0, 10)}.csv`)}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase rounded transition"
        >
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-left text-xs min-w-[560px]">
          <thead className="text-zinc-400 font-mono border-b border-border bg-black/40">
            <tr>
              <th className="py-2 px-3">CATEGORÍA</th>
              <th className="py-2 px-3">UNIDADES</th>
              <th className="py-2 px-3">VALOR (PRECIO VENTA)</th>
              <th className="py-2 px-3">COSTO REAL</th>
              <th className="py-2 px-3">MARGEN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {categories.map((c) => (
              <tr key={c.category} className="hover:bg-zinc-900/40 transition-colors">
                <td className="py-2 px-3 font-bold text-zinc-200">{c.category}</td>
                <td className="py-2 px-3 font-mono">{c.unitsInStock}</td>
                <td className="py-2 px-3 font-mono">${Math.round(c.retailValue).toLocaleString('es-MX')}</td>
                <td className="py-2 px-3 font-mono text-zinc-400">{c.costValue !== null ? `$${Math.round(c.costValue).toLocaleString('es-MX')}` : '—'}</td>
                <td className="py-2 px-3 font-mono" style={{ color: c.marginPct !== null ? '#C5A059' : undefined }}>
                  {c.marginPct !== null ? `${c.marginPct}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
