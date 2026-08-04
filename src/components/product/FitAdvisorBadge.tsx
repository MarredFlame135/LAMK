// src/components/product/FitAdvisorBadge.tsx

'use client';

import React from 'react';
import { FitAdvisor } from '@/types/product';

interface FitAdvisorBadgeProps {
  advisor: FitAdvisor;
}

const FIT_LABELS: Record<FitAdvisor['fitType'], { text: string; icon: string }> = {
  TRUE_TO_SIZE: { text: 'TALLA REAL', icon: '✅' },
  HALF_SIZE_UP: { text: 'PIDE 0.5 TALLA MÁS GRANDE', icon: '⬆️' },
  HALF_SIZE_DOWN: { text: 'PIDE 0.5 TALLA MÁS CHICA', icon: '⬇️' },
};

export function FitAdvisorBadge({ advisor }: FitAdvisorBadgeProps) {
  const { fitType, recommendationNote } = advisor;
  const { text, icon } = FIT_LABELS[fitType];

  return (
    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#E60026]">
        <span>{icon}</span>
        <span>FIT ADVISOR: {text}</span>
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">{recommendationNote}</p>
    </div>
  );
}
