// src/components/catalog/DiscoveryTabs.tsx
//
// Pestañas de descubrimiento compartidas entre Home y Catálogo. "TODOS" es
// el estado por defecto (sin filtrar) para no esconder inventario real detrás
// de una pestaña obligatoria.

'use client';

import React from 'react';
import { DISCOVERY_TABS, DiscoveryTab } from '@/lib/discovery';

interface DiscoveryTabsProps {
  active: DiscoveryTab;
  onChange: (tab: DiscoveryTab) => void;
  counts?: Partial<Record<DiscoveryTab, number>>;
}

export function DiscoveryTabs({ active, onChange, counts }: DiscoveryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-bold font-mono">
      <button
        onClick={() => onChange('ALL')}
        className={`px-3 py-1.5 rounded-lg border transition ${
          active === 'ALL'
            ? 'bg-[#FF1E42] border-[#FF1E42] text-white'
            : 'bg-muted border-border text-zinc-400 hover:text-foreground'
        }`}
      >
        TODOS
      </button>
      {DISCOVERY_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
            active === tab.id
              ? 'bg-[#FF1E42] border-[#FF1E42] text-white'
              : 'bg-muted border-border text-zinc-400 hover:text-foreground'
          }`}
        >
          <span className="opacity-60 mr-1">{tab.index}</span>{tab.label}
          {counts?.[tab.id] !== undefined && <span className="ml-1 opacity-70">({counts[tab.id]})</span>}
        </button>
      ))}
    </div>
  );
}
