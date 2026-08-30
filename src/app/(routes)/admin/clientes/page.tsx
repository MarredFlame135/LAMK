// src/app/(routes)/admin/clientes/page.tsx
//
// Fase D.5: segmentación RFM real + demanda insatisfecha desde Most
// Wanted. Ficha de cliente 360° (D.5) y cohortes/afinidad de categoría
// quedan pendientes — ver nota de cierre en CLAUDE.md.

import React from 'react';
import { getStoreCustomersWithXp } from '@/lib/shopify/admin';
import { getUnmetDemand } from '@/lib/wishlist';
import { ClientSegmentationTable } from '@/components/admin/ClientSegmentationTable';
import { UnmetDemandPanel } from '@/components/admin/UnmetDemandPanel';

export const dynamic = 'force-dynamic';

export default async function AdminClientesPage() {
  const [customers, unmetDemand] = await Promise.all([
    getStoreCustomersWithXp(250),
    getUnmetDemand(10),
  ]);

  return (
    <div className="p-6 bg-background text-foreground space-y-8">
      <div className="border-b border-border pb-4">
        <a href="/admin" className="text-[10px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-widest transition">← Panel de Mando</a>
        <span className="block text-xs font-mono text-[#FF1E42] uppercase tracking-widest mt-1">// CLIENTES</span>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight mt-1">Segmentación RFM</h1>
      </div>

      {customers.length === 0 ? (
        <div className="p-6 bg-card border border-amber-900/50 rounded-lg text-xs text-amber-400">
          Sin Admin API configurada (o sin clientes con cuenta todavía) — no hay nada que segmentar.
        </div>
      ) : (
        <ClientSegmentationTable customers={customers} />
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">// DEMANDA INSATISFECHA (MOST WANTED)</h2>
        <UnmetDemandPanel rows={unmetDemand} />
      </div>
    </div>
  );
}
