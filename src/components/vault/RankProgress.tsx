// src/components/vault/RankProgress.tsx
//
// Fase B ("Prompt Maestro v4", mejora de look 2026-08-29): la barra de XP
// anterior era una barra de progreso genérica (0 a 100% del tramo actual,
// sin memoria de los rangos ya superados). Esta es una barra de "nivel de
// videojuego" real: recorre TODA la escalera (0 → TIER_THRESHOLDS.MAX) con
// un checkpoint marcado en cada umbral, así el usuario ve de un vistazo
// cuánto camino ya recorrió, no solo cuánto le falta para el siguiente
// peldaño. El rango actual se resalta en el eje; el resto son solo datos
// reales de TIER_LADDER, nada inventado.

'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TierInfo } from '@/utils/gamification';
import { TIER_LADDER, TIER_THRESHOLDS, getNextUnlockPerk } from '@/utils/gamification';
import { EASE_LUXURY } from '@/lib/motion';

const CRIMSON = '#FF1E42';
const GOLD = '#C5A059';

interface RankProgressProps {
  tierInfo: TierInfo;
}

export function RankProgress({ tierInfo }: RankProgressProps) {
  const reduceMotion = useReducedMotion();
  const fillPercent = Math.min(100, (tierInfo.currentXp / TIER_THRESHOLDS.MAX) * 100);
  const nextPerk = getNextUnlockPerk(tierInfo);
  const isMaxed = tierInfo.nextTier === 'HALL_OF_FAME';

  return (
    <div className="rounded-lg border border-border/80 bg-muted p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em]">
        <span className="text-muted-foreground">// Progreso de Rango</span>
        <span className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {tierInfo.currentXp.toLocaleString()} XP · {tierInfo.currentPieces} pieza{tierInfo.currentPieces === 1 ? '' : 's'}
          </span>
          <span className="font-bold" style={{ color: GOLD }}>
            {fillPercent.toFixed(0)}%
          </span>
        </span>
      </div>

      {/* Riel del nivel — checkpoints reales en cada umbral de TIER_LADDER */}
      <div className="relative pt-2 pb-6">
        <div className="relative h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.2, ease: EASE_LUXURY }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${CRIMSON}, ${GOLD})` }}
          />
        </div>

        {/* Marcador de posición actual — el "estás aquí" del nivel, con
            pulso sutil (movimiento real, respeta reduced-motion). */}
        <motion.div
          className="absolute top-0 -translate-x-1/2"
          initial={{ left: 0 }}
          animate={{ left: `${fillPercent}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.2, ease: EASE_LUXURY }}
        >
          <span
            className={`block h-3.5 w-3.5 rounded-full border-2 border-black ${reduceMotion ? '' : 'animate-pulse'}`}
            style={{ background: GOLD, boxShadow: `0 0 12px ${GOLD}` }}
          />
        </motion.div>

        {/* Checkpoints de cada rango a lo largo del riel */}
        {TIER_LADDER.map((row) => {
          const pos = (row.threshold / TIER_THRESHOLDS.MAX) * 100;
          const reached = tierInfo.currentXp >= row.threshold;
          const isCurrent = row.tier === tierInfo.currentTier;
          return (
            <div
              key={row.tier}
              className="absolute top-2.5 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${pos}%` }}
            >
              <span
                className="block h-2.5 w-2.5 rounded-full border"
                style={{
                  background: reached ? GOLD : '#050507',
                  borderColor: reached ? GOLD : '#3f3f46',
                }}
              />
              <span
                className={`mt-1.5 text-[8px] font-mono uppercase tracking-wide whitespace-nowrap ${
                  isCurrent ? 'font-bold' : 'text-muted-foreground'
                }`}
                style={isCurrent ? { color: GOLD } : undefined}
              >
                {row.tier}
              </span>
            </div>
          );
        })}
      </div>

      {/* Próximo desbloqueo — reemplaza el "te faltan X XP" plano por algo
          que nombra la recompensa, no solo la distancia (un progreso sin
          recompensa nombrada no motiva, ver brief). */}
      {isMaxed ? (
        <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: GOLD }}>
          Rango máximo alcanzado — eres LEGEND.
        </p>
      ) : (
        <div className="space-y-1.5">
          {/* Los DOS requisitos, no solo el XP. Desde el recálculo de rangos
              (2026-09-03) subir de nivel pide XP y un mínimo de piezas: si aquí
              solo se dijera cuánto XP falta, alguien con el XP cumplido vería
              "0 XP para subir" y no subiría, sin ninguna explicación. */}
          <p className="font-mono text-[11px] text-foreground">
            <span className="text-muted-foreground font-normal">Para subir a</span>{' '}
            <span className="font-bold" style={{ color: CRIMSON }}>{tierInfo.nextTier}</span>
          </p>
          <ul className="space-y-0.5">
            <Requisito
              cumplido={tierInfo.xpRemaining === 0}
              texto={
                tierInfo.xpRemaining === 0
                  ? `${tierInfo.nextTierXp.toLocaleString()} XP — cumplido`
                  : `Te faltan ${tierInfo.xpRemaining.toLocaleString()} XP (de ${tierInfo.nextTierXp.toLocaleString()})`
              }
            />
            <Requisito
              cumplido={tierInfo.piecesRemaining === 0}
              texto={
                tierInfo.piecesRemaining === 0
                  ? `${tierInfo.nextTierPieces} piezas verificadas — cumplido`
                  : `Te faltan ${tierInfo.piecesRemaining} pieza${tierInfo.piecesRemaining === 1 ? '' : 's'} (tienes ${tierInfo.currentPieces} de ${tierInfo.nextTierPieces})`
              }
            />
          </ul>
          {nextPerk && <p className="text-[10px] text-muted-foreground pt-0.5">Desbloquea: {nextPerk}</p>}
        </div>
      )}
    </div>
  );
}

// Una línea de requisito, con una marca cuando ya está cumplido. El color no
// es lo único que distingue cumplido de pendiente (el símbolo también), para
// que se lea sin depender de percibir el matiz.
function Requisito({ cumplido, texto }: { cumplido: boolean; texto: string }) {
  return (
    <li className="flex items-start gap-1.5 font-mono text-[10px] leading-relaxed">
      <span aria-hidden style={cumplido ? { color: GOLD } : undefined} className={cumplido ? '' : 'text-muted-foreground'}>
        {cumplido ? '✓' : '·'}
      </span>
      <span className={cumplido ? 'text-muted-foreground' : 'text-foreground'}>{texto}</span>
    </li>
  );
}
