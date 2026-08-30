// src/components/vault/CollectorPlaque.tsx
//
// Fase B ("Prompt Maestro v4", mejora de look 2026-08-29): la Bóveda antes
// abría con un avatar+nombre+pill de tier — funcional, pero se leía como
// header de perfil, no como membresía. Esto es la credencial física: mismo
// lenguaje de placa técnica que ya usa ProductCard ("LAMK Vault // Verified
// · Serial #..."), aplicado al propio coleccionista. Solo datos reales:
// nunca se inventa una fecha de ingreso ni un índice que no existe todavía
// (ver nota en CollectorVault.tsx sobre el Índice de Colección de B.3, que
// requiere una fórmula de rareza/diversidad que no está construida aún).

import React from 'react';
import { motion } from 'framer-motion';
import { UserProfile } from '@/types/user';
import { deriveCollectorSerial } from '@/lib/utils';
import { CountUp } from '@/components/ui/count-up';
import { fadeUp } from '@/lib/motion';

const CRIMSON = '#FF1E42';
const GOLD = '#C5A059';

interface CollectorPlaqueProps {
  user: UserProfile;
  displayName: string;
}

export function CollectorPlaque({ user, displayName }: CollectorPlaqueProps) {
  const serial = deriveCollectorSerial(user.id);

  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Retícula técnica sutil — mismo truco que el fondo del hero de home,
          sin depender de un asset de imagen. Puramente decorativo, opacidad
          muy baja: no compite con el contenido. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative p-5 sm:p-6 space-y-5">
        {/* Cabecera de placa — idéntico vocabulario a ProductCard */}
        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <span>LAMK Vault // Collector</span>
          <span>#{serial}</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none">
              {displayName}
            </h1>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ borderColor: CRIMSON, color: CRIMSON }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: CRIMSON }} />
              {user.tier}
            </div>
          </div>

          {/* Estadísticas reales — sin ÍNDICE inventado, solo XP y piezas */}
          <div className="flex items-center gap-5 font-mono">
            <div className="text-right">
              <div className="text-lg font-black tabular-nums" style={{ color: GOLD }}>
                <CountUp value={user.xp} />
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">XP</div>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden />
            <div className="text-right">
              <div className="text-lg font-black tabular-nums text-foreground">{user.collection.length}</div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Piezas</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
