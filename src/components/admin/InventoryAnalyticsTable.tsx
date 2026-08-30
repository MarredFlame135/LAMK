// src/components/admin/InventoryAnalyticsTable.tsx
//
// Fase D.6. Disciplina "terminal financiera" — tabla densa, mono,
// ordenable, sin decoración. Estados vacío/carga ya resueltos por el
// server component que la monta (siempre llega con datos o un arreglo
// vacío real, nunca "cargando" del lado del cliente).

'use client';

import React, { useMemo, useState } from 'react';
import { InventoryRow, InventorySignal } from '@/lib/shopify/inventory-analytics';

const SIGNAL_STYLES: Record<InventorySignal, { label: string; color: string }> = {
  REPONER: { label: 'REPONER', color: '#C5A059' },
  DESCONTAR: { label: 'DESCONTAR', color: '#FF1E42' },
  SIN_ACTIVIDAD: { label: 'SIN ACTIVIDAD', color: '#71717a' },
  NORMAL: { label: 'NORMAL', color: '#52525b' },
};

type SortKey = 'stockRemaining' | 'daysListed' | 'hypeScore' | 'salesUnits90d' | 'views24h';

export function InventoryAnalyticsTable({ rows, salesDataAvailable }: { rows: InventoryRow[]; salesDataAvailable: boolean }) {
  const [filter, setFilter] = useState<InventorySignal | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('stockRemaining');

  const filtered = useMemo(() => {
    const base = filter === 'ALL' ? rows : rows.filter((r) => r.signal === filter);
    return [...base].sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1));
  }, [rows, filter, sortKey]);

  const counts = useMemo(() => {
    const c: Record<InventorySignal, number> = { REPONER: 0, DESCONTAR: 0, SIN_ACTIVIDAD: 0, NORMAL: 0 };
    for (const r of rows) c[r.signal]++;
    return c;
  }, [rows]);

  if (rows.length === 0) {
    return <div className="p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground text-xs">Sin productos en el catálogo.</div>;
  }

  return (
    <div className="space-y-3">
      {!salesDataAvailable && (
        <div className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-lg text-[11px] text-amber-400">
          Sin Admin API configurada, "ventas 90d" queda en 0 para todo — la señal REPONER/DESCONTAR se basa solo en Hype Index y stock, no en ventas reales todavía.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'REPONER', 'DESCONTAR', 'SIN_ACTIVIDAD', 'NORMAL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wide border transition"
            style={
              filter === s
                ? { borderColor: '#C5A059', color: '#C5A059', background: 'rgba(197,160,89,0.08)' }
                : { borderColor: 'var(--border)', color: '#a1a1aa' }
            }
          >
            {s === 'ALL' ? `Todos (${rows.length})` : `${SIGNAL_STYLES[s].label} (${counts[s]})`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="text-muted-foreground font-mono border-b border-border bg-muted">
            <tr>
              <th className="py-2 px-3">PRODUCTO</th>
              <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('stockRemaining')}>STOCK</th>
              <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('daysListed')}>DÍAS PUBLICADO</th>
              <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('hypeScore')}>ÍNDICE</th>
              <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('views24h')}>VISTAS 24H</th>
              <th className="py-2 px-3 cursor-pointer" onClick={() => setSortKey('salesUnits90d')}>VENTAS 90D</th>
              <th className="py-2 px-3">SEÑAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((r) => {
              const style = SIGNAL_STYLES[r.signal];
              return (
                <tr key={r.id} className="hover:bg-muted transition-colors">
                  <td className="py-2 px-3 max-w-[240px]">
                    <a href={`/product/${r.handle}`} target="_blank" rel="noreferrer" className="font-bold text-foreground hover:underline truncate block">
                      {r.title}
                    </a>
                    <span className="text-[10px] text-muted-foreground font-mono">{r.brand}</span>
                  </td>
                  <td className="py-2 px-3 font-mono">{r.isSoldOut ? <span className="text-[#FF1E42]">AGOTADO</span> : r.stockRemaining}</td>
                  <td className="py-2 px-3 font-mono text-muted-foreground">{r.daysListed ?? '—'}</td>
                  <td className="py-2 px-3 font-mono">{r.hypeSampleSize >= 50 ? r.hypeScore.toFixed(1) : '—'}</td>
                  <td className="py-2 px-3 font-mono text-muted-foreground">{r.views24h}</td>
                  <td className="py-2 px-3 font-mono text-muted-foreground">{r.salesUnits90d}</td>
                  <td className="py-2 px-3">
                    <span className="font-mono text-[10px] font-bold uppercase" style={{ color: style.color }}>{style.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
