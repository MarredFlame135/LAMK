// src/components/vault/CollectionIndexPanel.tsx
//
// Fase B (brief B.3, punto 3): el Índice de Colección, desglosado. A
// diferencia del Índice de producto (hype.ts, hallazgo #2 de Fase A), las
// 4 señales de este SÍ tienen fuente de datos real hoy — ver
// computeCollectionIndex en utils/gamification.ts para el porqué de cada
// una. Mismo lenguaje visual que RankProgress (checkpoints, mono HUD).

import React from 'react';
import { motion } from 'framer-motion';
import { CollectionIndexBreakdown } from '@/utils/gamification';
import { CountUp } from '@/components/ui/count-up';
import { fadeUp, EASE_LUXURY } from '@/lib/motion';

const GOLD = '#C5A059';
const CRIMSON = '#FF1E42';

const ROWS: { key: keyof Omit<CollectionIndexBreakdown, 'score'>; label: string }[] = [
  { key: 'accumulatedValue', label: 'Valor acumulado' },
  { key: 'averageRarity', label: 'Rareza promedio' },
  { key: 'categoryDiversity', label: 'Diversidad de categoría' },
  { key: 'vintage', label: 'Antigüedad' },
];

export function CollectionIndexPanel({ breakdown }: { breakdown: CollectionIndexBreakdown }) {
  return (
    <motion.div variants={fadeUp} className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">// Índice de Colección</h4>
        <span className="font-mono text-2xl font-black tabular-nums" style={{ color: GOLD }}>
          <CountUp value={breakdown.score} />
        </span>
      </div>

      <div className="space-y-2.5">
        {ROWS.map((row, i) => (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wide">{row.label}</span>
              <span className="text-zinc-300 font-bold">{breakdown[row.key].toFixed(0)}</span>
            </div>
            <div className="h-1 w-full rounded-full bg-zinc-900 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${CRIMSON}, ${GOLD})` }}
                initial={{ width: 0 }}
                whileInView={{ width: `${breakdown[row.key]}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE_LUXURY, delay: 0.1 + i * 0.08 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
