// src/app/(routes)/template.tsx
//
// Transición de página (fade + slide) — a diferencia de layout.tsx,
// template.tsx de Next.js SÍ se remonta en cada navegación dentro del mismo
// segmento, así que es el lugar correcto para animar la entrada de cada
// página sin tener que gestionar pathname/AnimatePresence a mano.

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { EASE_LUXURY } from '@/lib/motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_LUXURY }}
    >
      {children}
    </motion.div>
  );
}
