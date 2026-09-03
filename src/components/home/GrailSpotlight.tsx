// src/components/home/GrailSpotlight.tsx
//
// "EL GRAIL" — la pieza MÁS CARA del catálogo vivo, presentada como se
// presenta una pieza única en una subasta: sala a oscuras, un solo objeto
// iluminado, y el precio dicho sin rodeos.
//
// Por qué existe (2026-09-03, pedido del cliente: cambiar la animación del
// despiece "por el par más caro"). Los 96 fotogramas del despiece son de un
// tenis genérico ya renderizado y no se pueden regenerar por producto: el
// catálogo son 265 piezas vivas de Shopify y cuál es la más cara cambia solo.
// Colgarle el cartel de "la pieza más cara" a la foto de OTRA pieza sería
// justo lo que este repo se prohíbe. Así que el despiece se queda diciendo lo
// que dice (autenticidad) y el grail es una sección propia con la pieza REAL:
// su foto, su precio y su ficha. Cuando el catálogo cambie, esto cambia solo.
//
// El grail se elige en el servidor (`pickGrail`, lib/showcase-selection.ts) y
// baja como una sola prop — no las 265 piezas.
//
// --- La restricción que manda sobre el diseño visual ---
//
// Las fotos de Shopify no traen canal alfa, así que el producto nunca puede
// "flotar": lo que se pega en la sección es el rectángulo completo, fondo
// incluido. El resto del sitio lo resuelve con la técnica del nicho iluminado
// (banda clara dentro del rango tonal de las fotos + viñeta radial que se come
// la orilla) — ver spotlight-carousel.tsx y VaultZones.tsx.
//
// **Aquí ESA técnica no sirve, y se comprobó en el navegador, no en el
// código.** El nicho claro da por hecho que todas las fotos vienen sobre gris
// de estudio, y el grail actual del catálogo (Jordan 4 x Off-White) está
// fotografiado sobre fondo OSCURO: sobre la banda clara salía una mancha negra
// con un aro de luz alrededor. Y como el grail lo elige el catálogo vivo, no
// se puede diseñar para el fondo de una foto en particular.
//
// La salida que funciona con las dos es el ENCUADRE: un marco de canto dorado
// declara "esto es una fotografía", y entonces el fondo del cuadro —claro u
// oscuro— deja de leerse como un error de recorte. El precio y la marca salen
// FUERA de la foto, sobre el fondo de la sección, para que su contraste no
// dependa de qué foto toque hoy.
//
// Consecuencia: dentro del marco los colores van HARDCODEADOS, no con tokens
// de tema. El marco no cambia con el tema porque las fotos tampoco.

'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Product } from '@/types/product';
import { maxPrice } from '@/lib/showcase-selection';
import { EASE_LUXURY } from '@/lib/motion';

const GOLD = '#C5A059';

// Fondo del marco: casi negro, un punto por encima del negro de la sección,
// para que el marco se despegue de la sala sin encender un rectángulo claro.
const FRAME_BG = '#0B0B0F';

interface GrailSpotlightProps {
  product: Product | null;
}

export function GrailSpotlight({ product }: GrailSpotlightProps) {
  const reduceMotion = useReducedMotion();

  // Sin pieza no hay sección. Mismo criterio que SocialProofSection e
  // IGLiveMonitor: antes que inventar un grail, no ofrecerlo.
  if (!product) return null;

  const price = maxPrice(product);
  const image = product.images[0];
  const ease = reduceMotion ? undefined : EASE_LUXURY;
  const dur = (seconds: number) => (reduceMotion ? 0 : seconds);

  return (
    <section className="relative overflow-hidden bg-black py-20 sm:py-28">
      {/* Haz de luz cenital. Crece de la nada al entrar la sección: es lo que
          convierte "una foto centrada" en "algo que acaban de iluminar". */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[70%] w-[120%] -translate-x-1/2"
        style={{
          background: `conic-gradient(from 180deg at 50% 0%, transparent 42%, ${GOLD}22 50%, transparent 58%)`,
        }}
        initial={{ opacity: 0, scaleY: 0.4 }}
        whileInView={{ opacity: 1, scaleY: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: dur(1.4), ease }}
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 px-4">
        <motion.p
          className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: GOLD }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: dur(0.6), ease }}
        >
          // El Grail · la pieza más cara del catálogo
        </motion.p>

        {/* Marco. La apertura vertical (scaleY desde el centro) es la cortina
            de una vitrina que se abre; el `transformOrigin` en el centro es lo
            que hace que se lea así y no como un elemento que simplemente
            crece. */}
        <motion.a
          href={`/product/${product.handle}`}
          className="group relative block w-full max-w-2xl overflow-hidden rounded-2xl border"
          style={{ borderColor: `${GOLD}66`, background: FRAME_BG, transformOrigin: 'center' }}
          initial={{ opacity: 0, scaleY: 0.05, scaleX: 0.9 }}
          whileInView={{ opacity: 1, scaleY: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: dur(1), ease, delay: dur(0.15) }}
          aria-label={`Ver ${product.title}`}
        >
          {/* Cuadrado, no 4:3: las fotos de Shopify son 3000×3000. Con
              cualquier otra proporción, `object-contain` deja franjas del
              fondo del marco a los lados — invisibles con esta foto (viene
              sobre negro) y muy visibles con las del resto del catálogo, que
              vienen sobre gris claro. */}
          <div className="relative aspect-square w-full">
            {image && (
              <Image
                src={image}
                alt={product.title}
                fill
                sizes="(max-width: 672px) 100vw, 672px"
                className="object-contain transition-transform duration-700 group-hover:scale-[1.03]"
              />
            )}
          </div>

          {/* Cartela del marco: marca y precio sobre el fondo del propio marco,
              nunca encima de la foto. Es lo que hace que se lean igual de bien
              con una foto clara que con una oscura. */}
          <div
            className="flex items-end justify-between gap-4 border-t px-5 py-4 sm:px-7"
            style={{ borderColor: `${GOLD}33` }}
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {product.brand}
            </span>
            <span className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              ${price.toLocaleString('es-MX')}
              <span className="ml-1.5 align-top font-mono text-[10px] font-bold tracking-widest" style={{ color: GOLD }}>
                MXN
              </span>
            </span>
          </div>
        </motion.a>

        <motion.div
          className="flex max-w-3xl flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: dur(0.7), ease, delay: dur(0.5) }}
        >
          <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl">
            {product.title}
          </h2>

          {/* Solo se dice lo que hay. `collaboration` y `colorway` vienen de
              metafields reales y no todas las piezas los traen; el
              `storySummary` NO se muestra porque es la misma frase genérica
              para las 265 piezas del catálogo. */}
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-400">
            {[product.storytelling.collaboration, product.storytelling.colorway].filter(Boolean).join(' · ')}
          </p>

          <a
            href={`/product/${product.handle}`}
            className="mt-2 rounded-xl border px-8 py-3.5 font-mono text-[11px] font-black uppercase tracking-[0.15em] transition-colors"
            style={{ borderColor: GOLD, color: GOLD }}
          >
            Ver la pieza →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
