// src/components/admin/ClientSegmentationTable.tsx
//
// Fase D.5. Misma disciplina "terminal financiera" que el resto del admin.

'use client';

import React, { useMemo, useState } from 'react';
import { AdminCustomer } from '@/types/admin';
import { CustomerSegment, SEGMENT_META, segmentCustomer } from '@/lib/customer-segmentation';

function toCsv(rows: (AdminCustomer & { segment: CustomerSegment })[]): string {
  const header = ['Nombre', 'Email', 'Teléfono', 'Segmento', 'Pedidos', 'Gasto total MXN', 'Último pedido'];
  const lines = rows.map((r) => [
    r.name, r.email, r.phone, SEGMENT_META[r.segment].label, r.ordersCount, r.totalSpent, r.lastOrderDate ?? '',
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
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

export function ClientSegmentationTable({ customers }: { customers: AdminCustomer[] }) {
  const [filter, setFilter] = useState<CustomerSegment | 'ALL'>('ALL');

  const withSegment = useMemo(
    () => customers.map((c) => ({ ...c, segment: segmentCustomer(c) })),
    [customers]
  );

  const distribution = useMemo(() => {
    const d = Object.fromEntries(Object.keys(SEGMENT_META).map((k) => [k, 0])) as Record<CustomerSegment, number>;
    for (const c of withSegment) d[c.segment]++;
    return d;
  }, [withSegment]);

  const filtered = filter === 'ALL' ? withSegment : withSegment.filter((c) => c.segment === filter);

  const exportFiltered = () => {
    downloadCsv(toCsv(filtered), `lamk-clientes-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(SEGMENT_META) as CustomerSegment[]).map((seg) => (
          <button
            key={seg}
            onClick={() => setFilter(filter === seg ? 'ALL' : seg)}
            className="p-3 bg-card border rounded-lg text-left transition"
            style={filter === seg ? { borderColor: '#C5A059' } : { borderColor: 'var(--border)' }}
          >
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{SEGMENT_META[seg].label}</p>
            <p className="text-lg font-mono font-bold">{distribution[seg]}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
          {filter === 'ALL' ? `${filtered.length} clientes` : `${filtered.length} en "${SEGMENT_META[filter].label}" — ${SEGMENT_META[filter].action}`}
        </p>
        <button onClick={exportFiltered} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase rounded transition">
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-left text-xs min-w-[640px]">
          <thead className="text-muted-foreground font-mono border-b border-border bg-muted">
            <tr>
              <th className="py-2 px-3">CLIENTE</th>
              <th className="py-2 px-3">SEGMENTO</th>
              <th className="py-2 px-3">PEDIDOS</th>
              <th className="py-2 px-3">GASTO TOTAL</th>
              <th className="py-2 px-3">ÚLTIMO PEDIDO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-muted transition-colors">
                <td className="py-2 px-3">
                  <p className="font-bold text-foreground truncate max-w-[180px]">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{c.phone || c.email}</p>
                </td>
                <td className="py-2 px-3 font-mono text-[10px] uppercase">{SEGMENT_META[c.segment].label}</td>
                <td className="py-2 px-3 font-mono">{c.ordersCount}</td>
                <td className="py-2 px-3 font-mono">${c.totalSpent.toLocaleString('es-MX')}</td>
                <td className="py-2 px-3 font-mono text-muted-foreground">
                  {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-muted-foreground text-xs">Sin clientes en este segmento.</div>}
      </div>
    </div>
  );
}
