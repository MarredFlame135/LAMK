// src/components/home/HeroSection.tsx
//
// Hero de la home separado en componente cliente para poder usar Framer Motion
// (page.tsx se queda como Server Component leyendo el catálogo).

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { AnimatedText } from '@/components/ui/animated-shiny-text';
import { Floating, FloatingElement } from '@/components/ui/parallax-floating';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative py-20 px-4 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center overflow-hidden">
      {/* Halo de luz de fondo, marca del "Luxury Asphalt" */}
      <div className="pointer-events-none absolute -top-32 left-1/3 w-[36rem] h-[36rem] bg-[#E60026]/10 rounded-full blur-[120px]" />

      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12 }}
        className="lg:col-span-7 space-y-6 relative"
      >
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="flex items-center gap-3">
          <span className="px-3 py-1 bg-red-950/60 border border-red-600/40 rounded-full text-[10px] font-mono text-red-500 font-bold uppercase">
            🔥 PLATAFORMA PWA NEXT-GEN
          </span>
          <ThemeAndLangSwitcher />
        </motion.div>

        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.55 }}
          className="text-4xl sm:text-6xl font-black uppercase tracking-tight leading-none"
        >
          NO VENDES TENIS. <br />
          <AnimatedText gradient={['#E60026', '#E60026', '#E8B84B']}>CONSTRUYES UN CLUB</AnimatedText> <br />
          DE COLECCIONISTAS.
        </motion.h1>

        <motion.p variants={fadeUp} transition={{ duration: 0.55 }} className="text-zinc-400 text-sm sm:text-base max-w-xl leading-relaxed">
          Bienvenido a {SAAS_CONFIG.brandName}. Cada compra acumula puntos XP, desbloquea rangos VIP en la Bóveda del Coleccionista y te da acceso a Drops exclusivos antes que a nadie.
        </motion.p>

        <motion.div variants={fadeUp} transition={{ duration: 0.55 }} className="flex flex-wrap gap-4 pt-2">
          <motion.a
            href="/catalog"
            whileHover={{ scale: 1.03, boxShadow: '0 20px 40px -12px rgba(230,0,38,0.5)' }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-[#E60026] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-red-900/30"
          >
            VER CATÁLOGO EXCLUSIVO →
          </motion.a>
          <motion.a
            href="/admin/offline-sales"
            whileHover={{ scale: 1.03, borderColor: 'rgba(230,0,38,0.6)' }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-transparent border border-zinc-700 text-zinc-200 font-black text-xs uppercase tracking-widest rounded-xl"
          >
            PANEL ADMIN POS & DEUDAS
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Tarjeta Visual de TENISIN — cristal + parallax con el mouse + iluminación holográfica en hover */}
      <Floating className="lg:col-span-5 h-full min-h-[22rem]">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ y: -4, boxShadow: '0 30px 60px -20px rgba(230,0,38,0.35)' }}
          className="absolute inset-0 bg-gradient-to-b from-[#121215]/90 to-black/90 backdrop-blur-md border border-zinc-800 p-8 rounded-3xl overflow-hidden text-center space-y-4 shadow-2xl flex flex-col items-center justify-center"
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
          <span className="px-3 py-1.5 bg-[#E60026] text-white text-[10px] font-black uppercase rounded-full shadow-lg">🔥 Hype 98%</span>
        </FloatingElement>
        <FloatingElement depth={1.5} className="bottom-6 left-6">
          <span className="px-3 py-1.5 bg-amber-500 text-black text-[10px] font-black uppercase rounded-full shadow-lg">+30 XP</span>
        </FloatingElement>
      </Floating>
    </section>
  );
}
