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
import { motion, useReducedMotion } from 'framer-motion';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { ThemeAndLangSwitcher } from '@/components/ui/ThemeAndLangSwitcher';
import { Floating } from '@/components/ui/parallax-floating';
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

// --- Titular animado -------------------------------------------------------
//
// El titular pasó de tres líneas a una sola —"BIENVENIDO AL CLUB LAMK"— y esa
// línea entra letra por letra (2026-09-03, pedido del cliente). No es adorno:
// la frase ES una bienvenida, y una bienvenida que se escribe delante de ti se
// lee como que alguien te está admitiendo, no como un letrero que ya estaba
// ahí. Ese es el gesto, y por eso el movimiento se justifica (regla de
// CLAUDE.md: una animación nueva tiene que decir algo).
//
// Cómo está hecho, y por qué NO con AnimatedText (el brillo diagonal que
// usaba el titular anterior): AnimatedText pinta un gradiente sobre el
// contenedor y lo recorta con `background-clip: text`. Cualquier descendiente
// con `transform` —que es exactamente lo que necesita cada letra para
// entrar— crea su propio contexto de composición y deja de recibir ese fondo
// recortado: las letras animadas saldrían invisibles. Así que el degradado
// crimson→oro de la última palabra se hace con un color SÓLIDO distinto por
// letra, interpolado a mano. Se ve igual y no pelea con el movimiento.

const CRIMSON = [255, 30, 66];
const GOLD = [197, 160, 89];

// Color de la letra `i` de `total` dentro de la última palabra: crimson en la
// primera y oro en la última, mezclando en medio.
function rampColor(i: number, total: number): string {
  const k = total <= 1 ? 0 : i / (total - 1);
  const ch = CRIMSON.map((c, n) => Math.round(c + (GOLD[n] - c) * k));
  return `rgb(${ch.join(',')})`;
}

// `transformPerspective` y no un `perspective` en el contenedor: la propiedad
// CSS `perspective` solo afecta a los hijos DIRECTOS, y aquí las letras
// cuelgan de un <span> de palabra (necesario para que una palabra nunca se
// parta a mitad de renglón). Sin esto el rotateX se aplica sin proyección y la
// letra se ve aplastada en vez de girando hacia el frente.
const LETTER = {
  hidden: { opacity: 0, y: '0.6em', rotateX: -85, scale: 1.3, transformPerspective: 800 },
  show: { opacity: 1, y: 0, rotateX: 0, scale: 1, transformPerspective: 800 },
};

function AnimatedHeadline({ text }: { text: string }) {
  const prefersReducedMotion = useReducedMotion();

  // Mismo patrón obligatorio del repo (ver AnatomySequence): los EFECTOS
  // pueden leer la media query, el JSX nunca — el servidor no puede saberla y
  // ramificar el marcado con ella tumba la hidratación de toda la página.
  // Aquí el marcado es idéntico en los dos casos; lo único que cambia con
  // `reducedUI` es la duración (0) y el destello final, que se monta un frame
  // después de montar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reducedUI = mounted && Boolean(prefersReducedMotion);

  const words = text.split(' ').filter(Boolean);
  const lastIndex = words.length - 1;

  return (
    <motion.h1
      aria-label={text}
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: reducedUI ? 0 : 0.045, delayChildren: reducedUI ? 0 : 0.15 }}
      className="relative font-display text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.95]"
    >
      {words.map((word, w) => (
        <span key={`${word}-${w}`} className="inline-block whitespace-nowrap" aria-hidden>
          {[...word].map((char, c) => (
            <motion.span
              key={`${char}-${c}`}
              variants={LETTER}
              transition={reducedUI ? { duration: 0 } : { duration: 0.75, ease: EASE_LUXURY }}
              className="inline-block will-change-transform"
              style={w === lastIndex ? { color: rampColor(c, word.length) } : undefined}
            >
              {char}
            </motion.span>
          ))}
          {/* El espacio va FUERA de la palabra: un espacio dentro del
              inline-block se colapsaría y las palabras quedarían pegadas. */}
          {w < lastIndex && <span className="inline-block w-[0.28em]" />}
        </span>
      ))}

      {/* Destello que cruza el titular una sola vez, justo después de que
          aterriza la última letra. `mix-blend-overlay` para que ilumine las
          letras sin taparlas, y `pointer-events-none` porque encima del
          titular está el resto del hero. */}
      {/* El recorte va en este envoltorio y NO en el <h1>: con overflow-hidden
          en el titular, la entrada de las letras (que empiezan 0.6em abajo y a
          escala 1.3) se vería cortada por arriba y por abajo. */}
      {!reducedUI && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.span
            className="absolute inset-y-0 -left-1/3 w-1/3 mix-blend-overlay"
            style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)' }}
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: ['0%', '400%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.1, delay: 0.15 + text.replace(/ /g, '').length * 0.045, ease: 'easeOut' }}
          />
        </span>
      )}
    </motion.h1>
  );
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

        <AnimatedHeadline text={t.hero.headline} />

        <motion.p variants={fadeUp} className="text-zinc-400 text-sm sm:text-base max-w-xl leading-relaxed">
          {t.hero.subtitle}
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
              Tu asistente para encontrar cualquier pieza
            </p>
          </div>
        </motion.div>

        {/* La insignia flotante "Index 98.0" se eliminó (2026-09-03, el cliente
            preguntó qué indicaba). No indicaba NADA: era un número escrito a
            mano, y el propio comentario que la acompañaba decía "decorativas".
            Es justo lo que este repo se prohíbe — un número inventado en la
            primera pantalla enseña a desconfiar de los que sí son reales, como
            el Hype Index de la ficha de producto, que cuando no tiene muestra
            suficiente muestra un guion en vez de rellenar el hueco. */}
      </Floating>
    </section>
  );
}
