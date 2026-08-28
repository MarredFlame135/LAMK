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

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { AnimatedText } from '@/components/ui/animated-shiny-text';
import { Floating, FloatingElement } from '@/components/ui/parallax-floating';
import { fadeUp, EASE_LUXURY } from '@/lib/motion';
import { useApp } from '@/context/AppContext';

// Ciclo de poses al hover — usa las 4 imágenes reales que ya existen para el
// widget de chat (mascotPoses), solo que aquí es decorativo: al pasar el
// cursor, TENISIN va cambiando de pose cada ~450ms en vez de quedarse fijo.
const HOVER_POSE_CYCLE: Array<keyof typeof SAAS_CONFIG.mascotPoses> = ['idle', 'thinking', 'happy', 'notFound'];

function useHoverPoseCycle() {
  const [pose, setPose] = useState<keyof typeof SAAS_CONFIG.mascotPoses>('idle');
  const [isHovering, setIsHovering] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isHovering) { setPose('idle'); indexRef.current = 0; return; }
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % HOVER_POSE_CYCLE.length;
      setPose(HOVER_POSE_CYCLE[indexRef.current]);
    }, 450);
    return () => clearInterval(id);
  }, [isHovering]);

  return { pose, onMouseEnter: () => setIsHovering(true), onMouseLeave: () => setIsHovering(false) };
}

export function HeroSection() {
  const { t } = useApp();
  const hoverPose = useHoverPoseCycle();
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
        {/* Fix (hallazgo #2 de la auditoría de Fase 3): esta textura era el
            elemento LCP de toda la home y pesaba 1.7 MB en PNG sin comprimir
            — ahora es WebP (28 KB) del mismo archivo. */}
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{ backgroundImage: "url('/assets/hero/obsidian-texture.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}
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
        className="lg:col-span-8 space-y-6 relative"
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

      {/* Tarjeta de TENISIN — antes ocupaba media hero (col-span-5, min-h-22rem);
          ahora es una insignia discreta que solo llama la atención al hover
          (más pequeña, sin el bloque de texto grande). Al pasar el cursor,
          la pose va cambiando entre las 4 imágenes reales del mascot. */}
      <Floating className="lg:col-span-4 flex lg:justify-end">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE_LUXURY }}
          whileHover={{ y: -3, scale: 1.03, boxShadow: '0 20px 40px -16px rgba(255,30,66,0.4)' }}
          onMouseEnter={hoverPose.onMouseEnter}
          onMouseLeave={hoverPose.onMouseLeave}
          className="relative flex items-center gap-3 bg-gradient-to-b from-[#0E0E13]/90 to-black/90 backdrop-blur-md border border-zinc-800 pl-3 pr-4 py-3 rounded-2xl shadow-xl cursor-pointer max-w-[15rem]"
        >
          {/* Fix (hallazgo #1 de la auditoría de Fase 3): antes era un
              <img> plano cargando el PNG original de hasta 6.4 MB para un
              contenedor de 56px — ahora next/image sobre el WebP ya
              redimensionado (240×240, ~20 KB). */}
          <div className="w-14 h-14 shrink-0 relative animate-float tenisin-glow">
            <Image
              src={SAAS_CONFIG.mascotPoses[hoverPose.pose]}
              alt={SAAS_CONFIG.mascotName}
              fill
              sizes="56px"
              className="object-contain transition-opacity duration-150"
            />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wide">
              {SAAS_CONFIG.mascotName} · IA en vivo
            </span>
            <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
              Tu asistente de caza de kicks
            </p>
          </div>
        </motion.div>

        {/* Insignias flotantes decorativas, siguen el mouse en paralaje */}
        <FloatingElement depth={2.5} className="top-0 right-0">
          <span className="px-2.5 py-1 bg-[#FF1E42] text-white text-[9px] font-black font-mono uppercase tracking-wide rounded-full shadow-lg">Index 98.0</span>
        </FloatingElement>
      </Floating>
    </section>
  );
}
