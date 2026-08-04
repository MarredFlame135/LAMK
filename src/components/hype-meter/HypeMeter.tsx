// src/components/hype-meter/HypeMeter.tsx

'use client';

import React from 'react';
import { HypeMeterData } from '@/types/product';

interface HypeMeterProps {
  data: HypeMeterData;
}

export function HypeMeter({ data }: HypeMeterProps) {
  const { score, viewsLast24h, stockRemaining, label } = data;

  return (
    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-2 my-4">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-[#E60026]">
          <span className="animate-bounce">🔥</span>
          <span>HYPE METER: {label}</span>
        </div>
        <span className="text-zinc-400 text-[11px]">
          👁️ {viewsLast24h} vistas hoy
        </span>
      </div>

      {/* Barra de progreso de Hype */}
      <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-zinc-800">
        <div
          className="bg-gradient-to-r from-orange-500 via-red-600 to-[#E60026] h-full transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
        <span>Stock: {stockRemaining > 0 ? `${stockRemaining} pares restantes` : 'Agotado'}</span>
        <span>Demanda: {score}%</span>
      </div>
    </div>
  );
}