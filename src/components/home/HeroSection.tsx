// src/components/home/HeroSection.tsx
//
// Hero de la home separado en componente cliente para poder usar Framer Motion
// (page.tsx se queda como Server Component leyendo el catálogo).
//
// Ronda 2026-08-27 (parte 2): se quitó el <ThemeSwitcher /> (Home ya no
// selecciona entre 3 propuestas, ver page.tsx) y se sumó fotografía real
// generada con Higgsfield en vez de solo gradientes — foto editorial del
// sneaker de fondo + textura "Obsidian Quarry" como capa sutil de profundidad.

'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { AnimatedText } from '@/components/ui/animated-shiny-text';
import { Floating, FloatingElement } from '@/components/ui/parallax-floating';
import { fadeUp, EASE_LUXURY } from '@/lib/motion';
import { useApp } from '@/context/AppContext';

export function HeroSection() {
  const { t } = useApp();
  return (
    <section className="relative py-20 px-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center overflow-hidden">
      {/* Fondo fotográfico real (Higgsfield, soul_2) + textura "Obsidian Quarry"
          (soul_location) como capa de profundidad — reemplaza el halo de blur
          liso por una pieza visual de verdad, con overlay para que el texto
          siga siendo legible encima. */}
      <div className="absolute inset-0">
        <Image
          src="/assets/hero/hero-sneaker.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{ backgroundImage: "url('/assets/hero/obsidian-texture.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/50" />
      </div>

      {/* Halo de luz — acento Crimson Alert, ahora sobre la foto en vez de solo sobre gradiente */}
      <div className="pointer-events-none absolute -top-32 left-1/3 w-[36rem] h-[36rem] bg-[#FF1E42]/10 rounded-full blur-[120px]" />

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12 }}
        className="lg:col-span-7 space-y-6 relative"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="px-3 py-1 bg-red-950/60 border border-red-600/40 rounded-full text-[10px] font-mono text-red-500 font-bold uppercase tracking-[0.15em]">
            // {t.hero.badge}
          </span>
          <ThemeAndLangSwitcher />
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display text-4xl sm:text-6xl font-black uppercase tracking-tight leading-none"
        >
          {t.hero.headline1} <br />
          <AnimatedText gradient={['#FF1E42', '#FF1E42', '#C5A059']}>{t.hero.headline2}</AnimatedText> <br />
          {t.hero.headline3}
        </motion.h1>

        <motion.p variants={fadeUp} className="text-zinc-400 text-sm sm:text-base max-w-xl leading-relaxed">
          {t.hero.subtitleLead} {SAAS_CONFIG.brandName}. {t.hero.subtitleTail}
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-2">
          <motion.a
            href="/catalog"
            whileHover={{ scale: 1.03, boxShadow: '0 20px 40px -12px rgba(255,30,66,0.5)' }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-[#FF1E42] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-red-900/30"
          >
            {t.hero.ctaCatalog}
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Tarjeta Visual de TENISIN — cristal + parallax con el mouse + iluminación holográfica en hover */}
      <Floating className="lg:col-span-5 h-full min-h-[22rem]">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE_LUXURY }}
          whileHover={{ y: -4, boxShadow: '0 30px 60px -20px rgba(255,30,66,0.35)' }}
          className="absolute inset-0 bg-gradient-to-b from-[#0E0E13]/90 to-black/90 backdrop-blur-md border border-zinc-800 p-8 rounded-3xl overflow-hidden text-center space-y-4 shadow-2xl flex flex-col items-center justify-center"
        >
          <div className="w-32 h-32 mx-auto relative animate-float tenisin-glow">
            <img
              src={SAAS_CONFIG.mascotPoses.idle}
              alt={SAAS_CONFIG.mascotName}
              className="w-full h-full object-contain"
            />
          </div>

          <div>
            <span className="text-xs font-mono text-amber-400 uppercase font-bold">
              CONOCE A {SAAS_CONFIG.mascotName} 👟
            </span>
            <h3 className="text-lg font-black uppercase mt-1">TU ASISTENTE IA DE CAZA DE KICKS</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              "{SAAS_CONFIG.mascotGreeting}"
            </p>
          </div>
        </motion.div>

        {/* Insignias flotantes decorativas, siguen el mouse en paralaje */}
        <FloatingElement depth={2.5} className="top-4 right-6">
          <span className="px-3 py-1.5 bg-[#FF1E42] text-white text-[10px] font-black font-mono uppercase tracking-wide rounded-full shadow-lg">Index 98.0</span>
        </FloatingElement>
        <FloatingElement depth={1.5} className="bottom-6 left-6">
          <span className="px-3 py-1.5 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full shadow-lg">+30 XP</span>
        </FloatingElement>
      </Floating>
    </section>
  );
}
