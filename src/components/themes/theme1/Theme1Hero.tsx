// src/components/themes/theme1/Theme1Hero.tsx
//
// Hero de "Ink & Static" — identidad de cómic impreso: papel envejecido,
// halftone (radial-gradient repetido, no imagen), bordes gruesos y sombras
// sólidas sin difuminar. El grano de papel es un data-URI de feTurbulence
// (sin red externa, cumple el CSP de este entorno igual que en el prototipo
// que se le mostró al cliente).

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { ThemeSwitcher } from '@/components/themes/ThemeSwitcher';
import { fadeUp } from '@/lib/motion';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { Magnetic } from '@/components/ui/Magnetic';

const GRAIN_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

const HALFTONE_BG = 'radial-gradient(circle, #17130F 1.1px, transparent 1.6px)';

export function Theme1Hero() {
  return (
    <section className="relative bg-[#EDE3D0] text-[#17130F] border-b-4 border-[#17130F] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: GRAIN_BG }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: HALFTONE_BG, backgroundSize: '7px 7px' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <span className="font-display text-sm font-black uppercase tracking-tight">{SAAS_CONFIG.shortBrandName}</span>
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="flex items-center gap-2">
          <ThemeAndLangSwitcher />
          <ThemeSwitcher />
        </motion.div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-20 sm:pb-24">
        <p className="font-mono text-[11px] tracking-[0.18em] text-[#17130F]/70 mb-4">LOOK AT MY KICKS PRESENTA</p>
        <motion.h1
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="font-display text-5xl sm:text-7xl md:text-8xl font-black uppercase leading-[0.92] max-w-3xl"
        >
          KICKS QUE<br />
          <span className="text-[#D42B1B]" style={{ WebkitTextStroke: '2px #17130F' }}>ROMPEN EL PANEL</span>
        </motion.h1>
        <motion.p
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.12 }}
          className="mt-6 max-w-md text-[#17130F]/75 text-sm sm:text-base leading-relaxed"
        >
          Cada par sale de su propia caja de historieta. Directo al drop, con el peso gráfico de un cómic impreso.
        </motion.p>
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Magnetic className="inline-block" strength={0.3}>
            <a
              href="#hyped-kicks"
              className="font-display text-sm uppercase tracking-wide px-6 py-3 bg-[#D42B1B] text-[#F6EFDD] border-[3px] border-[#17130F] shadow-[5px_5px_0_#17130F] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-transform"
            >
              Ver el drop
            </a>
          </Magnetic>
          <a
            href="/catalog"
            className="font-display text-sm uppercase tracking-wide px-6 py-3 bg-[#F6EFDD] text-[#17130F] border-[3px] border-[#17130F] shadow-[5px_5px_0_#17130F] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-transform"
          >
            Ver catálogo
          </a>
        </motion.div>
      </div>
    </section>
  );
}
