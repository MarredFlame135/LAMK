// src/utils/gamification.ts

import { CollectorTier } from '@/types/user';

export interface TierInfo {
  currentTier: CollectorTier;
  nextTier: CollectorTier | 'HALL_OF_FAME';
  currentXp: number;
  nextTierXp: number;
  progressPercentage: number;
  xpRemaining: number;
}

// XP dinámico por Hype: mientras más caliente esté la prenda al momento de la
// compra, más XP rinde cada peso gastado en ella. Un producto sin hype (0%)
// da el 1:1 de siempre; un drop al tope (100%) da el doble.
//   Factor de Hype = 1 + (Hype Score / 100)
//   XP Ganados = Precio MXN × Factor de Hype
export function calculateHypeXp(priceMxn: number, hypeScore: number): number {
  const factor = 1 + Math.max(0, Math.min(100, hypeScore)) / 100;
  return Math.round(priceMxn * factor);
}

// Escala matemática progresiva (+30% por nivel)
export const TIER_THRESHOLDS = {
  ROOKIE: 0,
  HYPEBEAST: 2000,
  COLLECTOR: 4600,   // 2,000 + 2,600
  LEGEND: 7980,      // 4,600 + 3,380
  MAX: 12374,        // 7,980 + 4,394
};

export function calculateGamificationTier(xp: number): TierInfo {
  if (xp >= TIER_THRESHOLDS.MAX) {
    return {
      currentTier: 'LEGEND',
      nextTier: 'HALL_OF_FAME',
      currentXp: xp,
      nextTierXp: TIER_THRESHOLDS.MAX,
      progressPercentage: 100,
      xpRemaining: 0,
    };
  } else if (xp >= TIER_THRESHOLDS.COLLECTOR) {
    const nextXp = TIER_THRESHOLDS.MAX;
    const currentLevelXp = xp - TIER_THRESHOLDS.COLLECTOR;
    const levelRange = nextXp - TIER_THRESHOLDS.COLLECTOR;
    return {
      currentTier: 'COLLECTOR',
      nextTier: 'LEGEND',
      currentXp: xp,
      nextTierXp: nextXp,
      progressPercentage: Math.min(100, (currentLevelXp / levelRange) * 100),
      xpRemaining: nextXp - xp,
    };
  } else if (xp >= TIER_THRESHOLDS.HYPEBEAST) {
    const nextXp = TIER_THRESHOLDS.COLLECTOR;
    const currentLevelXp = xp - TIER_THRESHOLDS.HYPEBEAST;
    const levelRange = nextXp - TIER_THRESHOLDS.HYPEBEAST;
    return {
      currentTier: 'HYPEBEAST',
      nextTier: 'COLLECTOR',
      currentXp: xp,
      nextTierXp: nextXp,
      progressPercentage: Math.min(100, (currentLevelXp / levelRange) * 100),
      xpRemaining: nextXp - xp,
    };
  } else {
    const nextXp = TIER_THRESHOLDS.HYPEBEAST;
    return {
      currentTier: 'ROOKIE',
      nextTier: 'HYPEBEAST',
      currentXp: xp,
      nextTierXp: nextXp,
      progressPercentage: Math.min(100, (xp / nextXp) * 100),
      xpRemaining: nextXp - xp,
    };
  }
}

// Fuente única para todo lo que muestre la escalera de rangos (Placa de
// Coleccionista, barra de XP, panel de rangos) — antes CollectorVault.tsx
// tenía esta misma lista de perks hardcodeada inline solo para el panel
// lateral; ahora RankProgress ("próximo desbloqueo") y RankLadder la
// comparten, así que no puede quedar desincronizada entre los dos.
export const TIER_LADDER: { tier: CollectorTier; threshold: number; perk: string }[] = [
  { tier: 'ROOKIE', threshold: TIER_THRESHOLDS.ROOKIE, perk: 'Perfil básico y acceso a la comunidad.' },
  { tier: 'HYPEBEAST', threshold: TIER_THRESHOLDS.HYPEBEAST, perk: 'Alertas prioritarias de restock por WhatsApp.' },
  { tier: 'COLLECTOR', threshold: TIER_THRESHOLDS.COLLECTOR, perk: 'Acceso anticipado a drops (30 min antes).' },
  { tier: 'LEGEND', threshold: TIER_THRESHOLDS.LEGEND, perk: 'Piezas exclusivas, apartado extendido y eventos VIP.' },
];

// Perk del rango que todavía no alcanza — lo que muestra RankProgress como
// "próximo desbloqueo". null cuando ya está en el rango máximo (MAX).
export function getNextUnlockPerk(tierInfo: TierInfo): string | null {
  if (tierInfo.nextTier === 'HALL_OF_FAME') return null;
  return TIER_LADDER.find((row) => row.tier === tierInfo.nextTier)?.perk ?? null;
}