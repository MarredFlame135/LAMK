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