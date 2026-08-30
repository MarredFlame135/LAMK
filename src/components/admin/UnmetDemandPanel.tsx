// src/components/admin/UnmetDemandPanel.tsx
//
// Fase D.5: "demanda insatisfecha desde Most Wanted" — cuántas personas
// tienen cada producto en su wishlist. Real, no una proyección — cuenta
// directa de src/lib/wishlist.ts::getUnmetDemand().

import React from 'react';
import { UnmetDemandRow } from '@/lib/wishlist';

export function UnmetDemandPanel({ rows }: { rows: UnmetDemandRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-6 border border-dashed border-border rounded-lg text-center text-muted-foreground text-xs">
        Todavía nadie agregó nada a su Most Wanted — sin datos de demanda insatisfecha.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <a
          key={r.productId}
          href={`/product/${r.handle}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-2.5 bg-card border border-border rounded-lg hover:border-zinc-600 transition"
        >
          <div className="h-10 w-10 rounded bg-black overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.imageUrl} alt={r.title} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{r.title}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {r.isSoldOut ? <span className="text-[#FF1E42]">AGOTADO</span> : `${r.stockRemaining} en stock`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-mono font-bold" style={{ color: '#C5A059' }}>{r.wishlistCount}</p>
            <p className="text-[9px] text-muted-foreground uppercase">en wishlist</p>
          </div>
        </a>
      ))}
    </div>
  );
}
