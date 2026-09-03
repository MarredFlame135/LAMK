// src/components/vault/RankLadder.tsx
//
// Fase B ("Prompt Maestro v4", mejora de look 2026-08-29): reemplaza el
// panel "BENEFICIOS POR TIER" (una lista de filas con un punto de color) por
// una escalera de verdad — nodos conectados por una línea vertical, como un
// árbol de habilidades. El rango actual brilla y tiene su propio anillo; los
// ya alcanzados quedan sólidos en oro; los que faltan quedan apagados. Misma
// data que antes (TIER_LADDER, ahora compartida con RankProgress — ver
// utils/gamification.ts), solo cambia la forma.

import React from 'react';
import { motion } from 'framer-motion';
import { CollectorTier } from '@/types/user';
import { TIER_LADDER } from '@/utils/gamification';
import { fadeUp, staggerContainer } from '@/lib/motion';

const GOLD = '#C5A059';

// El requisito de un peldaño son DOS números, no uno. Enseñar solo el XP
// (como hasta el 2026-09-03) hacía que el mínimo de piezas fuera una regla
// invisible: la persona veía el XP cumplido y no entendía por qué no subía.
function requisitoLabel(index: number): string {
  const row = TIER_LADDER[index];
  if (index === 0) return 'Desde tu primera visita';
  const piezas = `${row.minPieces} pieza${row.minPieces === 1 ? '' : 's'}`;
  return `${row.threshold.toLocaleString()} XP  ·  ${piezas}`;
}

interface RankLadderProps {
  currentTier: CollectorTier;
}

export function RankLadder({ currentTier }: RankLadderProps) {
  const currentIndex = TIER_LADDER.findIndex((row) => row.tier === currentTier);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-1">
      <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">// Escalera de Rango</h4>

      <motion.ol variants={staggerContainer(0.08)} initial="hidden" animate="show" className="relative">
        {TIER_LADDER.map((row, i) => {
          const reached = i <= currentIndex;
          const isCurrent = row.tier === currentTier;
          const isLast = i === TIER_LADDER.length - 1;

          return (
            <motion.li key={row.tier} variants={fadeUp} className="relative flex gap-3.5 pb-5 last:pb-0">
              {/* Línea conectora — sólida en oro hasta el rango actual, apagada después */}
              {!isLast && (
                <span
                  className="absolute left-[9px] top-5 bottom-0 w-px"
                  style={{ background: reached ? GOLD : 'var(--border)' }}
                  aria-hidden
                />
              )}

              <span
                className={`relative mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 ${isCurrent ? 'animate-pulse' : ''}`}
                style={{
                  borderColor: reached ? GOLD : '#3f3f46',
                  background: reached ? GOLD : '#050507',
                  boxShadow: isCurrent ? `0 0 14px ${GOLD}` : undefined,
                }}
                aria-hidden
              >
                {reached && !isCurrent && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#050507" strokeWidth="3.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>

              <div className="flex-1 -mt-0.5">
                <div className="flex items-center gap-2">
                  <strong className={`font-mono text-xs uppercase tracking-wide ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {row.tier}
                  </strong>
                  {isCurrent && (
                    <span className="rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide" style={{ background: GOLD, color: '#050507' }}>
                      Tú
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{requisitoLabel(i)}</p>
                <p className={`text-xs mt-1 ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>{row.perk}</p>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>

      {/* Las reglas, escritas (2026-09-03, pedido del cliente: "que se muestren
          las reglas de los niveles y xp para que le quede claro a los
          clientes"). Antes el sistema era una barra que subía sin que nadie
          supiera por qué. Todo lo que dice aquí sale de utils/gamification.ts
          — si los umbrales cambian, esta lista no se queda vieja porque no
          repite ningún número: los peldaños de arriba los imprimen solos. */}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <h5 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// Cómo se sube de rango</h5>
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">1 peso = 1 XP.</strong> Cada peso que pagas por una pieza
            se convierte en un punto de experiencia.
          </li>
          <li>
            <strong className="text-foreground">El Hype multiplica.</strong> Si la pieza está caliente al
            momento de comprarla, ese XP se multiplica hasta por dos (×1 sin hype, ×2 con el Índice al tope).
          </li>
          <li>
            <strong className="text-foreground">Hacen falta las dos cosas.</strong> Cada rango pide XP
            <em> y</em> un mínimo de piezas verificadas. Una sola compra, por cara que sea, suma una pieza —
            así ningún rango se compra de un golpe.
          </li>
          <li>
            <strong className="text-foreground">Solo cuentan las compras pagadas.</strong> Una pieza entra a
            tu Bóveda cuando el pedido se paga. Las compras registradas a mano y aprobadas por un admin
            aparecen en tu closet, pero no suman XP: no hay pedido con el que verificarlas.
          </li>
          <li>
            <strong className="text-foreground">No se baja de rango.</strong> El XP y las piezas se acumulan;
            nada caduca.
          </li>
        </ul>
      </div>
    </div>
  );
}
