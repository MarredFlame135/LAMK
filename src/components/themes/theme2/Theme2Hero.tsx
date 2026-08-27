// src/components/themes/theme2/Theme2Hero.tsx
//
// Hero de "After Hours Market" — híbrido StockX (densidad de datos) / A Ma
// Manière (tipografía serif editorial). El panel "Índice LAMK" de la derecha
// no inventa cifras de mercado: son agregados reales calculados sobre el
// catálogo (products) que ya trae Home — score promedio real, vistas 24h
// reales, y el producto con más demanda real, todo del mismo hypeMeter que
// ya usa ProductCard.

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { ThemeSwitcher } from '@/components/themes/ThemeSwitcher';
import { fadeUp } from '@/lib/motion';
import { Product } from '@/types/product';
import { Magnetic } from '@/components/ui/Magnetic';

interface Theme2HeroProps {
  products: Product[];
}

export function Theme2Hero({ products }: Theme2HeroProps) {
  const available = products.filter((p) => !p.isSoldOut);
  const avgIndex = available.length
    ? available.reduce((sum, p) => sum + p.hypeMeter.score, 0) / available.length
    : 0;
  const totalViews24h = products.reduce((sum, p) => sum + p.hypeMeter.viewsLast24h, 0);
  const topDemand = [...available].sort((a, b) => b.hypeMeter.score - a.hypeMeter.score)[0];
  const discounted = products.filter((p) => {
    const v = p.variants[0];
    return v?.compareAtPrice !== undefined && v.compareAtPrice > v.price;
  });

  return (
    <section className="bg-[#F7F5F0] text-[#0C0C0D] dark:bg-[#0B0C0E] dark:text-[#F2F0EA] border-b border-black/10 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <span className="italic text-lg" style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif' }}>
          Look At My <b className="not-italic font-bold">Kicks</b>
        </span>
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="flex items-center gap-2">
          <ThemeAndLangSwitcher />
          <ThemeSwitcher />
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-10 items-end">
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] opacity-70 uppercase mb-3">Índice LAMK · sesión after hours</p>
          <motion.h1
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl leading-[1.03] max-w-xl"
            style={{ fontFamily: 'Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif' }}
          >
            El mercado <em className="text-[#8F7C50]">habla</em> antes que la campaña.
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="mt-5 max-w-md text-sm sm:text-base opacity-70 leading-relaxed"
          >
            Demanda real, stock real, descuentos reales — el mismo catálogo que ves aquí es el que está conectado ahora mismo a la tienda.
          </motion.p>
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ delay: 0.18 }} className="mt-7 flex gap-3">
            <Magnetic className="inline-block" strength={0.3}>
              <a href="#trading-floor" className="font-mono text-xs uppercase tracking-[0.06em] px-6 py-3 bg-[#0C0C0D] text-[#F7F5F0] dark:bg-[#F2F0EA] dark:text-[#0B0C0E] hover:opacity-85 transition">
                Explorar el mercado
              </a>
            </Magnetic>
            <a href="/catalog" className="font-mono text-xs uppercase tracking-[0.06em] px-6 py-3 border border-[#0C0C0D] dark:border-[#F2F0EA] hover:bg-[#0C0C0D] hover:text-[#F7F5F0] dark:hover:bg-[#F2F0EA] dark:hover:text-[#0B0C0E] transition">
              Ver catálogo
            </a>
          </motion.div>
        </div>

        <div className="border border-black/15 dark:border-white/15 bg-white dark:bg-[#111316] px-6 py-5">
          <Row k="Índice LAMK (promedio real)" v={avgIndex.toFixed(1)} />
          <Row k="Vistas 24h (catálogo)" v={totalViews24h.toLocaleString()} />
          {topDemand && <Row k="Mayor demanda real" v={topDemand.title} small />}
          <Row k="Piezas con descuento hoy" v={String(discounted.length)} />
          <Row k="Piezas disponibles" v={String(available.length)} last />
        </div>
      </div>
    </section>
  );
}

function Row({ k, v, small, last }: { k: string; v: string; small?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${last ? '' : 'border-b border-black/10 dark:border-white/10'}`}>
      <span className="text-[11px] uppercase tracking-[0.04em] opacity-60 shrink-0">{k}</span>
      <span className={`font-semibold font-mono tabular-nums text-right ${small ? 'text-sm truncate max-w-[60%]' : ''}`}>{v}</span>
    </div>
  );
}
