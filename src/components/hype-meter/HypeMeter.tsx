// src/components/hype-meter/HypeMeter.tsx

'use client';

import React from 'react';
import { HypeMeterData } from '@/types/product';
import { useApp } from '@/context/AppContext';

interface HypeMeterProps {
  data: HypeMeterData;
}

export function HypeMeter({ data }: HypeMeterProps) {
  const { score, viewsLast24h, stockRemaining, label } = data;
  const { t } = useApp();

  return (
    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-2 my-4">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold tracking-[0.15em] text-[#FF1E42] uppercase font-mono">
          <span>{t.product.hypeMeter}: INDEX {score.toFixed(1)} · {label}</span>
        </div>
        {viewsLast24h > 0 && (
          <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-[0.15em]">
            Terminal Active · {viewsLast24h} Viewing
          </span>
        )}
      </div>

      {/* Barra de progreso de Hype */}
      <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-zinc-800">
        <div
          className="bg-gradient-to-r from-[#FF1E42] to-[#C5A059] h-full transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-zinc-400 font-mono uppercase tracking-[0.1em]">
        <span>{stockRemaining > 0 ? `Deadstock · ${stockRemaining} Units Allocated` : 'Sold Out'}</span>
        <span>Verified Allocation · {score.toFixed(1)}</span>
      </div>
    </div>
  );
}